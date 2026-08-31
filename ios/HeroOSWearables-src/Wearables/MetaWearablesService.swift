// Wearables/MetaWearablesService.swift
//
// The ONLY file in Hero OS that talks to MWDATCore directly. Everything
// else (WearablesManager, the UI) goes through this. That's the seam the
// engineering spec asked for: if Meta's SDK surface changes, or Hero OS
// ever needs to swap it out, this is the one file that changes.
//
// Phase 1 scope only: SDK configuration, app registration, device
// discovery, and a device session (connect/disconnect). No camera
// capability is added — MWDATCamera is not imported because nothing in
// this phase needs it (confirmed against the getting-started and
// dat-conventions skill docs: MWDATCore alone covers registration,
// permissions, and device sessions).

import Foundation
import MWDATCore

@MainActor
final class MetaWearablesService {
    private let wearables = Wearables.shared

    private var registrationTask: Task<Void, Never>?
    private var devicesTask: Task<Void, Never>?
    private var sessionStateTask: Task<Void, Never>?
    private var sessionErrorTask: Task<Void, Never>?

    private(set) var deviceSession: DeviceSession?

    /// Calls Wearables.configure() once at launch. Must succeed before
    /// anything else in this service is used.
    func configure() -> Result<Void, Error> {
        do {
            try Wearables.configure()
            return .success(())
        } catch {
            return .failure(error)
        }
    }

    /// Forward the app-open URL Meta AI calls back with after registration.
    func handleOpenURL(_ url: URL) async {
        _ = try? await wearables.handleUrl(url)
    }

    func observeRegistrationState(_ onChange: @escaping (RegistrationState) -> Void) {
        registrationTask?.cancel()
        registrationTask = Task {
            for await state in wearables.registrationStateStream() {
                onChange(state)
            }
        }
    }

    func observeDevices(_ onChange: @escaping ([Device]) -> Void) {
        devicesTask?.cancel()
        devicesTask = Task {
            for await devices in wearables.devicesStream() {
                onChange(devices)
            }
        }
    }

    func startRegistration() async throws {
        try await wearables.startRegistration()
    }

    func startUnregistration() async throws {
        try await wearables.startUnregistration()
    }

    /// Informational only in Phase 1 — no capability actually needs this
    /// permission yet (camera arrives in a later phase). Reads status
    /// without prompting the user.
    func checkCameraPermissionStatus() async -> String {
        do {
            let status = try await wearables.checkPermissionStatus(.camera)
            return "\(status)"
        } catch {
            return "Unknown"
        }
    }

    /// Creates and starts a DeviceSession against whichever glasses are
    /// available (AutoDeviceSelector). No capability (camera, display) is
    /// added to the session in Phase 1 — this only proves the app can
    /// reach a "started" session against real (or mock) glasses.
    func connect(
        onSessionState: @escaping (SessionState) -> Void,
        onSessionError: @escaping (Error) -> Void
    ) throws {
        let selector = AutoDeviceSelector(wearables: wearables)
        let session = try wearables.createSession(deviceSelector: selector)
        deviceSession = session

        sessionStateTask?.cancel()
        sessionStateTask = Task {
            for await state in session.stateStream() {
                onSessionState(state)
            }
        }

        sessionErrorTask?.cancel()
        sessionErrorTask = Task {
            for await error in session.errorStream() {
                onSessionError(error)
            }
        }

        try session.start()
    }

    func disconnect() {
        deviceSession?.stop()
        sessionStateTask?.cancel()
        sessionErrorTask?.cancel()
        sessionStateTask = nil
        sessionErrorTask = nil
        deviceSession = nil
    }

    /// Offered when a session fails with .datAppOnTheGlassesUpdateRequired.
    func openDATGlassesAppUpdate() {
        wearables.openDATGlassesAppUpdate()
    }
}
