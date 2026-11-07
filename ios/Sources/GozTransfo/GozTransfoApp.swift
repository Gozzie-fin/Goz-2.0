import SwiftUI

@main
struct GozTransfoApp: App {
    @StateObject private var store = Store()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: Store
    @State private var showSettings = false

    var body: some View {
        TabView {
            TodayView(onOpenSettings: { showSettings = true })
                .tabItem { Label("Today", systemImage: "sun.max.fill") }

            DietView()
                .tabItem { Label("Diet", systemImage: "fork.knife") }

            GroceryView()
                .tabItem { Label("Grocery", systemImage: "cart.fill") }

            StatsView()
                .tabItem { Label("Stats", systemImage: "chart.xyaxis.line") }
        }
        .tint(Color.gozLime)
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .onAppear {
            // First launch: ask for the start date and goals before anything else.
            if store.data.startDate == nil { showSettings = true }
        }
    }
}
