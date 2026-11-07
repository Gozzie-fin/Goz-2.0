import Foundation

// MARK: - Persisted data (mirrors the web app's state shape where it matters)

struct Macros: Codable, Equatable {
    var p: Int
    var c: Int
    var f: Int
}

struct FoodEntry: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var cal: Int
    var p: Int
    var c: Int
    var f: Int
    var meal: String // "breakfast" | "lunch" | "snack" | "dinner"
    var time: Date = .now
}

struct DayLog: Codable {
    var steps: Int?
    var km: Double?
    var calsIn: Int?          // manual calories, used when there is no food log
    var weight: Double?
    var waterMl: Int = 0
    var workoutDone: Bool = false
    var moodScore: Int?       // 1...5, see Mood
    var wakeTime: Date?
    var sleepTime: Date?
    var notes: String = ""
    var foodLog: [FoodEntry] = []

    /// Calories eaten: the food log wins; manual entry is the fallback.
    var totalCalories: Int {
        foodLog.isEmpty ? (calsIn ?? 0) : foodLog.reduce(0) { $0 + $1.cal }
    }
    var totalMacros: Macros {
        Macros(
            p: foodLog.reduce(0) { $0 + $1.p },
            c: foodLog.reduce(0) { $0 + $1.c },
            f: foodLog.reduce(0) { $0 + $1.f }
        )
    }
}

struct GroceryEntry: Codable, Identifiable {
    var id = UUID()
    var week: Int
    var day: Int
    var name: String
    var qty: String
    var price: Double
    var store: String
    var date: Date = .now
}

struct AppData: Codable {
    var name: String = ""
    var startDate: Date?
    var startWeight: Double = 80
    var goalWeight: Double = 68
    var height: Double = 175
    var dailyCalGoal: Int = 1800
    var targetDays: Int = 120
    var waterGoalMl: Int = 3000
    var macroTargets = Macros(p: 150, c: 180, f: 55)
    var logs: [Int: DayLog] = [:]          // keyed by program day (1-based)
    var groceryLogs: [GroceryEntry] = []
}

// MARK: - Program phases

struct Phase: Identifiable {
    let id: Int
    let name: String
    let days: ClosedRange<Int>
    let hex: UInt32 // accent colour, 0xRRGGBB

    var label: String { "Phase \(id)" }
}

enum Plan {
    static let phases: [Phase] = [
        Phase(id: 1, name: "Detox & Reset", days: 1...30, hex: 0xFF453A),
        Phase(id: 2, name: "Build Momentum", days: 31...60, hex: 0xFF9F0A),
        Phase(id: 3, name: "Definition", days: 61...90, hex: 0x30D158),
        Phase(id: 4, name: "Lock It In", days: 91...120, hex: 0x0A84FF),
    ]

    static let mealTypes: [(key: String, label: String, icon: String)] = [
        ("breakfast", "Breakfast", "🌅"),
        ("lunch", "Lunch", "☀️"),
        ("snack", "Snack", "🍎"),
        ("dinner", "Dinner", "🌙"),
    ]

    static let moods: [(label: String, emoji: String, score: Int)] = [
        ("Amazing", "🔥", 5),
        ("Good", "😊", 4),
        ("Neutral", "😐", 3),
        ("Rough", "😞", 2),
        ("Bad", "😤", 1),
    ]

    /// Program day for a start date (day 1 = start date). Before start, returns 1.
    static func dayNumber(startDate: Date?, now: Date = .now) -> Int {
        guard let start = startDate else { return 1 }
        let cal = Calendar.current
        let elapsed = cal.dateComponents([.day],
                                         from: cal.startOfDay(for: start),
                                         to: cal.startOfDay(for: now)).day ?? 0
        return elapsed + 1
    }

    static func phase(for day: Int) -> Phase {
        let d = min(max(day, 1), 120)
        return phases.first { $0.days.contains(d) } ?? phases[0]
    }

    static func week(for day: Int) -> Int { Int(ceil(Double(max(day, 1)) / 7.0)) }
}
