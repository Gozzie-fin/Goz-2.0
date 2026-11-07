import Foundation

// Decoded from Resources/*.json, which are generated from src/App.jsx by
// ios/tools/gen-data.mjs. Re-run the script if the web data changes.

struct MealOption: Codable, Identifiable, Hashable {
    var id: String { name }
    let name: String
    let cal: Int
    let p: Int
    let c: Int
    let f: Int
    let desc: String
}

struct GroceryItem: Codable, Identifiable {
    var id: String { name }
    let name: String
    let qty: String
    let est: String
    let why: String
}

struct GroceryCategory: Codable, Identifiable {
    var id: String { cat }
    let cat: String
    let items: [GroceryItem]
}

struct Quote: Codable {
    let t: String
    let a: String
    let cat: String
}

enum BundledData {
    private static func load<T: Decodable>(_ name: String, as type: T.Type) -> T {
        guard let url = Bundle.module.url(forResource: name, withExtension: "json"),
              let raw = try? Data(contentsOf: url),
              let value = try? JSONDecoder().decode(T.self, from: raw)
        else {
            fatalError("Missing or invalid bundled resource: \(name).json")
        }
        return value
    }

    /// meal type key -> phase number (as string) -> options
    static let meals: [String: [String: [MealOption]]] =
        load("meals", as: [String: [String: [MealOption]]].self)

    /// phase number (as string) -> grocery categories
    static let grocery: [String: [GroceryCategory]] =
        load("grocery", as: [String: [GroceryCategory]].self)

    static let quotes: [Quote] = load("quotes", as: [Quote].self)

    static func quote(forDay day: Int) -> Quote {
        quotes[(max(day, 1) - 1) % quotes.count]
    }

    static func mealOptions(type: String, phase: Int) -> [MealOption] {
        meals[type]?[String(phase)] ?? []
    }

    static func groceryCategories(phase: Int) -> [GroceryCategory] {
        grocery[String(phase)] ?? grocery["1"] ?? []
    }
}
