import SwiftUI

@main
struct MoodwallApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        MenuBarExtra("Moodwall", systemImage: "photo.on.rectangle.angled") {
            MenuBarContentView()
                .environmentObject(appDelegate.state)
        }
        .menuBarExtraStyle(.menu)
    }
}
