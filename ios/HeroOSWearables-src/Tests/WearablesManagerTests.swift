// Tests/WearablesManagerTests.swift
//
// AUTOMATED TEST — runs in the iOS Simulator, no physical glasses.
// Uses MockDeviceKit to prove MetaWearablesService's device-discovery
// wiring works (a paired mock device shows up via devicesStream()).
//
// This does NOT prove: real registration with the Meta AI app (that
// requires the real app + a URL-scheme callback), or a real Bluetooth
// connection to physical Wayfarers. Those can only be confirmed by
// PHYSICAL DEVICE VERIFICATION — see ios/README.md's manual test
// checklist. Do not read a green run of this file as "the glasses
// connected."

import XCTest
@testable import HeroOSWearables
import MWDATCore
import MWDATMockDevice

@MainActor
final class WearablesManagerTests: XCTestCase {
    private var mockDevice: MockGlasses?

    override func setUp() async throws {
        try await super.setUp()
        MockDeviceKit.shared.enable()
        mockDevice = try MockDeviceKit.shared.pairGlasses(model: .rayBanMeta)
    }

    override func tearDown() async throws {
        MockDeviceKit.shared.disable()
        mockDevice = nil
        try await super.tearDown()
    }

    /// Powering on and donning a mock device should make it appear in
    /// Wearables.shared.devicesStream() — this is the same stream
    /// MetaWearablesService.observeDevices() consumes.
    func testMockDeviceAppearsInDevicesStream() async throws {
        mockDevice?.powerOn()
        mockDevice?.unfold()
        mockDevice?.don()

        let streamTask = Task {
            for await devices in Wearables.shared.devicesStream() {
                if !devices.isEmpty { return devices.count }
            }
            return 0
        }

        let timeoutTask = Task {
            try await Task.sleep(nanoseconds: 5_000_000_000)
            streamTask.cancel()
            return 0
        }

        let count = await streamTask.value
        timeoutTask.cancel()

        XCTAssertGreaterThan(count, 0, "Expected at least one mock device after don()")
    }
}
