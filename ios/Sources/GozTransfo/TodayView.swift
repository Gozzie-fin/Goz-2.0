import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var store: Store
    var onOpenSettings: () -> Void = {}

    private var rawDay: Int { Plan.dayNumber(startDate: store.data.startDate) }
    private var day: Int { min(max(rawDay, 1), store.data.targetDays) }
    private var phase: Phase { Plan.phase(for: day) }
    private var log: DayLog { store.log(for: day) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    headerCard
                    quoteCard
                    waterCard
                    activityCard
                    caloriesCard
                    moodCard
                    notesCard
                }
                .padding()
            }
            .background(Color.gozPage)
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: onOpenSettings) {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
            }
        }
    }

    // MARK: - Bindings into today's log

    private func binding<T>(_ keyPath: WritableKeyPath<DayLog, T>) -> Binding<T> {
        Binding(
            get: { store.log(for: day)[keyPath: keyPath] },
            set: { newValue in store.update(day) { $0[keyPath: keyPath] = newValue } }
        )
    }

    // MARK: - Cards

    private var headerCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                if rawDay > store.data.targetDays {
                    Text("Program complete 🎉")
                        .font(.title2.bold())
                } else {
                    Text("Day \(rawDay) of \(store.data.targetDays)")
                        .font(.title2.bold())
                }
                Text("\(phase.label) · \(phase.name)")
                    .font(.subheadline)
                    .foregroundStyle(Color(hex: phase.hex))
                ProgressView(value: Double(day), total: Double(store.data.targetDays))
                    .tint(Color(hex: phase.hex))
            }
        }
    }

    private var quoteCard: some View {
        let quote = BundledData.quote(forDay: day)
        return Card {
            VStack(alignment: .leading, spacing: 6) {
                Text("“\(quote.t)”")
                    .font(.body.italic())
                Text("— \(quote.a)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var waterCard: some View {
        let goal = store.data.waterGoalMl
        let ml = log.waterMl
        return Card {
            VStack(alignment: .leading, spacing: 10) {
                Label("Water", systemImage: "drop.fill")
                    .font(.headline)
                    .foregroundStyle(Color.gozCyan)
                Text("\(ml) / \(goal) ml")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                ProgressView(value: Double(min(ml, goal)), total: Double(goal))
                    .tint(Color.gozCyan)
                HStack {
                    Button("−250 ml") {
                        store.update(day) { $0.waterMl = max(0, $0.waterMl - 250) }
                    }
                    .buttonStyle(.bordered)
                    Spacer()
                    Button("+250 ml") {
                        store.update(day) { $0.waterMl += 250 }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.gozCyan)
                }
            }
        }
    }

    private var activityCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Label("Activity", systemImage: "figure.walk")
                    .font(.headline)
                    .foregroundStyle(Color.gozLime)
                LabeledField(title: "Steps") {
                    TextField("0", value: binding(\.steps), format: .number)
                        .numberPad()
                }
                LabeledField(title: "Distance (km)") {
                    TextField("0.0", value: binding(\.km), format: .number)
                        .decimalPad()
                }
                LabeledField(title: "Body weight (kg)") {
                    TextField("—", value: binding(\.weight), format: .number)
                        .decimalPad()
                }
                Toggle("Workout done", isOn: binding(\.workoutDone))
            }
        }
    }

    private var caloriesCard: some View {
        let eaten = log.totalCalories
        let goal = store.data.dailyCalGoal
        return Card {
            VStack(alignment: .leading, spacing: 10) {
                Label("Calories", systemImage: "flame.fill")
                    .font(.headline)
                    .foregroundStyle(Color.gozOrange)
                Text("\(eaten) / \(goal) kcal")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                ProgressView(value: Double(min(eaten, goal)), total: Double(max(goal, 1)))
                    .tint(eaten > goal ? .red : .gozOrange)
                if !log.foodLog.isEmpty {
                    Text("Calculated from your Diet log.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    LabeledField(title: "Calories eaten (manual)") {
                        TextField("0", value: binding(\.calsIn), format: .number)
                            .numberPad()
                    }
                }
            }
        }
    }

    private var moodCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("How do you feel?")
                    .font(.headline)
                HStack {
                    ForEach(Plan.moods, id: \.score) { mood in
                        let selected = log.moodScore == mood.score
                        Button {
                            store.update(day) {
                                $0.moodScore = selected ? nil : mood.score
                            }
                        } label: {
                            VStack(spacing: 2) {
                                Text(mood.emoji).font(.title2)
                                Text(mood.label).font(.caption2)
                            }
                            .padding(6)
                            .frame(maxWidth: .infinity)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(selected ? Color.gozLime.opacity(0.25) : .clear)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var notesCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                Text("Notes")
                    .font(.headline)
                TextField("How did today go?", text: binding(\.notes), axis: .vertical)
                    .lineLimit(3...6)
            }
        }
    }
}

/// Label on the left, control on the right.
struct LabeledField<Field: View>: View {
    let title: String
    @ViewBuilder var field: Field

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            field
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 140)
        }
    }
}
