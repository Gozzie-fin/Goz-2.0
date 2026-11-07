import SwiftUI

struct DietView: View {
    @EnvironmentObject private var store: Store
    @State private var mealType = "breakfast"

    private var rawDay: Int { Plan.dayNumber(startDate: store.data.startDate) }
    private var day: Int { min(max(rawDay, 1), store.data.targetDays) }
    private var phase: Phase { Plan.phase(for: day) }
    private var log: DayLog { store.log(for: day) }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Meal", selection: $mealType) {
                        ForEach(Plan.mealTypes, id: \.key) { type in
                            Text("\(type.icon) \(type.label)").tag(type.key)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Phase \(phase.id) ideas — swipe to log") {
                    ForEach(BundledData.mealOptions(type: mealType, phase: phase.id)) { option in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(option.name).font(.headline)
                            Text(option.desc)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("\(option.cal) kcal · P\(option.p) C\(option.c) F\(option.f)")
                                .font(.caption2)
                                .foregroundStyle(Color.gozLime)
                        }
                        .swipeActions(edge: .trailing) {
                            Button("Log") { add(option) }
                                .tint(Color.gozLime)
                        }
                    }
                }

                Section {
                    LabeledRow(title: "Calories",
                               value: "\(log.totalCalories) / \(store.data.dailyCalGoal)")
                    LabeledRow(title: "Protein",
                               value: "\(log.totalMacros.p) / \(store.data.macroTargets.p) g")
                    LabeledRow(title: "Carbs",
                               value: "\(log.totalMacros.c) / \(store.data.macroTargets.c) g")
                    LabeledRow(title: "Fat",
                               value: "\(log.totalMacros.f) / \(store.data.macroTargets.f) g")
                } header: {
                    Text("Today")
                }

                Section("Food log") {
                    if log.foodLog.isEmpty {
                        Text("Nothing logged yet.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(log.foodLog) { entry in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.name)
                            Text("\(entry.meal.capitalized) · \(entry.cal) kcal · P\(entry.p) C\(entry.c) F\(entry.f)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .onDelete { offsets in
                        store.update(day) { $0.foodLog.remove(atOffsets: offsets) }
                    }
                }
            }
            .navigationTitle("Diet")
        }
    }

    private func add(_ option: MealOption) {
        store.update(day) {
            $0.foodLog.append(FoodEntry(
                name: option.name,
                cal: option.cal,
                p: option.p,
                c: option.c,
                f: option.f,
                meal: mealType
            ))
        }
    }
}

struct LabeledRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            Text(value).foregroundStyle(.secondary)
        }
    }
}
