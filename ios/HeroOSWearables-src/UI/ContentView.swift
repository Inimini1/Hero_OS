// UI/ContentView.swift
//
// Phase 1's entire UI: connection status, Connect/Disconnect, and the
// dev-info panel (SDK/registration/permission/device state) called for
// in the spec. No camera, no vision, no voice — those are later phases.

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var wearables: WearablesManager

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 4) {
                Text("HERO OS")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .tracking(2)
                Text("JARVIS WEARABLE")
                    .font(.title2.bold())
            }
            .padding(.top, 32)

            statusCard

            VStack(spacing: 12) {
                Button(wearables.primaryActionTitle) {
                    wearables.primaryAction()
                }
                .buttonStyle(.borderedProminent)
                .disabled(wearables.connectionState == .connecting)

                Button("Disconnect") {
                    wearables.disconnect()
                }
                .buttonStyle(.bordered)
                .disabled(wearables.connectionState != .connected)

                if wearables.canOfferGlassesAppUpdate {
                    Button("Update app on glasses") {
                        wearables.openGlassesAppUpdate()
                    }
                    .buttonStyle(.bordered)
                }
            }

            devInfoPanel

            Spacer()
        }
        .padding()
    }

    private var statusCard: some View {
        VStack(spacing: 8) {
            Circle()
                .fill(statusColor)
                .frame(width: 14, height: 14)
            Text(wearables.connectionState.label)
                .font(.headline)
            if let message = wearables.connectionState.errorMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var statusColor: Color {
        switch wearables.connectionState {
        case .connected: return .green
        case .connecting, .configuring: return .yellow
        case .ready: return .blue
        case .disconnected: return .gray
        case .notConfigured, .error: return .red
        }
    }

    private var devInfoPanel: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("DEVELOPMENT INFO")
                .font(.caption2.bold())
                .foregroundStyle(.secondary)
            devInfoRow("SDK", wearables.sdkInitializedDescription)
            devInfoRow("Registration", wearables.registrationStateDescription)
            devInfoRow("Permission (camera)", wearables.permissionStateDescription)
            devInfoRow("Devices", wearables.deviceStateDescription)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func devInfoRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 130, alignment: .leading)
            Text(value)
                .font(.caption.monospaced())
            Spacer()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(WearablesManager())
}
