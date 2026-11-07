import Foundation
import Combine

/// Owns the app state and saves it as JSON in Application Support.
@MainActor
final class Store: ObservableObject {
    @Published var data: AppData {
        didSet { save() }
    }

    private let fileURL: URL

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory,
                                            in: .userDomainMask)[0]
        fileURL = base.appendingPathComponent("goz-transfo.json")

        if let raw = try? Data(contentsOf: fileURL),
           let decoded = try? JSONDecoder().decode(AppData.self, from: raw) {
            data = decoded
        } else {
            data = AppData()
        }
    }

    func log(for day: Int) -> DayLog {
        data.logs[day] ?? DayLog()
    }

    func update(_ day: Int, _ change: (inout DayLog) -> Void) {
        var entry = log(for: day)
        change(&entry)
        data.logs[day] = entry
    }

    private func save() {
        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(),
                withIntermediateDirectories: true)
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            try encoder.encode(data).write(to: fileURL, options: .atomic)
        } catch {
            print("Goz-Transfo: save failed: \(error)")
        }
    }
}
