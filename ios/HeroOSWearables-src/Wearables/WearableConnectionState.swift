// Wearables/WearableConnectionState.swift
//
// The single top-level status Hero OS shows the user for the Ray-Ban Meta
// connection. Every case here is driven by a real, observed MWDATCore
// state — nothing here is set optimistically just because a button was
// tapped. See WearablesManager for exactly which SDK signal drives each
// case.

import Foundation

enum WearableConnectionState: Equatable {
    case notConfigured
    case configuring
    case ready
    case connecting
    case connected
    case disconnected
    case error(String)

    var label: String {
        switch self {
        case .notConfigured: return "Not Configured"
        case .configuring: return "Configuring…"
        case .ready: return "Ready"
        case .connecting: return "Connecting…"
        case .connected: return "Connected"
        case .disconnected: return "Disconnected"
        case .error: return "Error"
        }
    }

    var errorMessage: String? {
        if case .error(let message) = self { return message }
        return nil
    }
}
