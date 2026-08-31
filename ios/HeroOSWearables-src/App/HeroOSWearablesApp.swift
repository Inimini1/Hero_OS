// App/HeroOSWearablesApp.swift
//
// App entry point. Configures the Meta Wearables SDK and routes the
// Meta AI callback URL to it — both required per the getting-started
// skill doc, regardless of which phase the app is in.

import SwiftUI
import MWDATCore

@main
struct HeroOSWearablesApp: App {
    @StateObject private var wearablesManager = WearablesManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(wearablesManager)
                .task {
                    wearablesManager.start()
                }
                .onOpenURL { url in
                    wearablesManager.handleOpenURL(url)
                }
        }
    }
}
