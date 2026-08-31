// Wearables/WearablesManager.swift
//
// SwiftUI-facing ObservableObject. Translates raw MWDATCore states (from
// MetaWearablesService) into the one WearableConnectionState the UI
// shows, plus the dev-info strings (registration/permission/device
// state) requested for Phase 1. This is where the "don't fake Connected"
// rule is enforced — every state transition here is a direct reaction to
// an observed SDK signal, never a guess made when a button is tapped.

import Foundation
import MWDATCore

@MainActor
final class WearablesManager: ObservableObject {
    @Published private(set) var connectionState: WearableConnectionState = .notConfigured
    @Published private(set) var sdkInitializedDescription = "Not yet configured"
    @Published private(set) var registrationStateDescription = "Unknown"
    @Published private(set) var permissionStateDescription = "Not checked"
    @Published private(set) var deviceStateDescription = "No devices discovered"
    @Published private(set) var canOfferGlassesAppUpdate = false

    private let service = MetaWearablesService()
    private var latestRegistrationState: RegistrationState?
    private var hasEverStartedSession = false

    /// Call once, from HeroOSWearablesApp.init() equivalent (a .task on
    /// the root view) — starts SDK configuration and begins observing
    /// registration + device streams.
    func start() {
        switch service.configure() {
        case .success:
            sdkInitializedDescription = "Configured"
            connectionState = .configuring
            observeRegistration()
            observeDevices()
            Task {
                permissionStateDescription = await service.checkCameraPermissionStatus()
            }
        case .failure(let error):
            sdkInitializedDescription = "Failed: \(error.localizedDescription)"
            connectionState = .error("Meta Wearables SDK is not configured.")
        }
    }

    func handleOpenURL(_ url: URL) {
        Task { await service.handleOpenURL(url) }
    }

    /// The single primary button. Its meaning depends on what's actually
    /// true right now — registering first, then connecting — never both
    /// implied by one fake "Connect" state.
    var primaryActionTitle: String {
        if latestRegistrationState != .registered { return "Register with Meta AI" }
        return "Connect"
    }

    func primaryAction() {
        if latestRegistrationState != .registered {
            register()
        } else {
            connect()
        }
    }

    func disconnect() {
        service.disconnect()
        connectionState = hasEverStartedSession ? .disconnected : .ready
    }

    // MARK: - Registration

    private func observeRegistration() {
        service.observeRegistrationState { [weak self] state in
            guard let self else { return }
            self.latestRegistrationState = state
            self.registrationStateDescription = "\(state)"

            // .unavailable always wins — nothing can work without
            // registration, no matter what a device session was doing.
            if state == .unavailable {
                self.connectionState = .error("Meta Wearables registration is unavailable.")
                return
            }

            // Once a device session has ever been started, its own state
            // stream (handleSessionState) is the sole authority over
            // connectionState — a later registration-stream event (e.g. a
            // stray .available) must not clobber a live .connected status.
            guard !self.hasEverStartedSession else { return }

            switch state {
            case .registered, .available:
                self.connectionState = .ready
            case .registering:
                self.connectionState = .connecting
            case .unavailable:
                break // handled above
            @unknown default:
                break
            }
        }
    }

    private func register() {
        connectionState = .connecting
        Task {
            do {
                try await service.startRegistration()
                // Result observed asynchronously via registrationStateStream —
                // the Meta AI app calls back through the URL scheme.
            } catch {
                connectionState = .error("Registration failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Devices

    private func observeDevices() {
        service.observeDevices { [weak self] devices in
            guard let self else { return }
            self.deviceStateDescription = devices.isEmpty
                ? "No devices discovered"
                : "\(devices.count) device(s): " + devices.map { "\($0.identifier)" }.joined(separator: ", ")
        }
    }

    // MARK: - Connection

    private func connect() {
        connectionState = .connecting
        canOfferGlassesAppUpdate = false
        do {
            try service.connect(
                onSessionState: { [weak self] state in
                    self?.handleSessionState(state)
                },
                onSessionError: { [weak self] error in
                    self?.handleSessionError(error)
                }
            )
        } catch DeviceSessionError.noEligibleDevice {
            connectionState = .error("No compatible glasses found.")
        } catch DeviceSessionError.datAppOnTheGlassesUpdateRequired {
            connectionState = .error("The Hero OS companion app on your glasses needs an update.")
            canOfferGlassesAppUpdate = true
        } catch {
            connectionState = .error("Connection failed: \(error.localizedDescription)")
        }
    }

    private func handleSessionState(_ state: SessionState) {
        switch state {
        case .idle:
            break
        case .starting:
            connectionState = .connecting
        case .started:
            hasEverStartedSession = true
            connectionState = .connected
        case .paused:
            // Device-initiated pause (per session-lifecycle docs) — keep
            // the connection alive, don't restart, don't call it an error.
            break
        case .stopping:
            connectionState = .connecting
        case .stopped:
            connectionState = hasEverStartedSession ? .disconnected : .ready
        @unknown default:
            break
        }
    }

    private func handleSessionError(_ error: Error) {
        connectionState = .error("Connection lost: \(error.localizedDescription)")
    }

    func openGlassesAppUpdate() {
        service.openDATGlassesAppUpdate()
    }
}
