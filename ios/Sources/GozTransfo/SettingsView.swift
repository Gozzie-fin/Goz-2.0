import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: Store
    @Environment(\.dismiss) private var dismiss

    @State private var draft = AppData()
    @State private var hasStartDate = false

    var body: some View {
        NavigationStack {
            Form {
                Section("You") {
                    TextField("Name", text: $draft.name)
                    Toggle("Program has started", isOn: $hasStartDate)
                    if hasStartDate {
                        DatePicker("Start date",
                                   selection: Binding(
                                       get: { draft.startDate ?? .now },
                                       set: { draft.startDate = $0 }),
                                   displayedComponents: .date)
                    }
                }

                Section("Body") {
                    LabeledField(title: "Start weight (kg)") {
                        TextField("80", value: $draft.startWeight, format: .number)
                            .decimalPad()
                    }
                    LabeledField(title: "Goal weight (kg)") {
                        TextField("68", value: $draft.goalWeight, format: .number)
                            .decimalPad()
                    }
                    LabeledField(title: "Height (cm)") {
                        TextField("175", value: $draft.height, format: .number)
                            .decimalPad()
                    }
                }

                Section("Daily targets") {
                    LabeledField(title: "Calories (kcal)") {
                        TextField("1800", value: $draft.dailyCalGoal, format: .number)
                            .numberPad()
                    }
                    LabeledField(title: "Protein (g)") {
                        TextField("150", value: $draft.macroTargets.p, format: .number)
                            .numberPad()
                    }
                    LabeledField(title: "Carbs (g)") {
                        TextField("180", value: $draft.macroTargets.c, format: .number)
                            .numberPad()
                    }
                    LabeledField(title: "Fat (g)") {
                        TextField("55", value: $draft.macroTargets.f, format: .number)
                            .numberPad()
                    }
                    LabeledField(title: "Water (ml)") {
                        TextField("3000", value: $draft.waterGoalMl, format: .number)
                            .numberPad()
                    }
                }
            }
            .navigationTitle("Settings")
            .inlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .bold()
                }
            }
            .onAppear(perform: load)
        }
        .interactiveDismissDisabled(store.data.startDate == nil)
    }

    private func load() {
        draft = store.data
        hasStartDate = store.data.startDate != nil
    }

    private func save() {
        var updated = draft
        updated.startDate = hasStartDate ? (draft.startDate ?? Calendar.current.startOfDay(for: .now)) : nil
        // Keep the logs the user already recorded; settings never touch them.
        updated.logs = store.data.logs
        updated.groceryLogs = store.data.groceryLogs
        store.data = updated
        dismiss()
    }
}
