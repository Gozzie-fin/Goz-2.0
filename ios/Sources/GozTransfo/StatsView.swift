import SwiftUI
import Charts

struct StatsView: View {
    @EnvironmentObject private var store: Store

    private var rawDay: Int { Plan.dayNumber(startDate: store.data.startDate) }
    private var day: Int { min(max(rawDay, 1), store.data.targetDays) }

    /// (program day, weight) for every day with a logged weight, oldest first.
    private var weights: [(day: Int, kg: Double)] {
        store.data.logs
            .compactMap { day, log in log.weight.map { (day: day, kg: $0) } }
            .sorted { $0.day < $1.day }
    }

    private var latestWeight: Double {
        weights.last?.kg ?? store.data.startWeight
    }

    /// Last seven program days, for the water chart.
    private var recentWater: [(day: Int, ml: Int)] {
        (max(1, day - 6)...day).map { ($0, store.log(for: $0).waterMl) }
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Progress") {
                    ProgressView(value: Double(day), total: Double(store.data.targetDays))
                        .tint(Color.gozLime)
                    LabeledRow(title: "Day", value: "\(day) of \(store.data.targetDays)")
                }

                Section("Weight") {
                    if weights.isEmpty {
                        Text("Log your weight on the Today tab to see the trend.")
                            .foregroundStyle(.secondary)
                    } else {
                        Chart {
                            RuleMark(y: .value("Goal", store.data.goalWeight))
                                .foregroundStyle(Color.gozOrange.opacity(0.6))
                                .lineStyle(StrokeStyle(dash: [4, 4]))
                            ForEach(weights, id: \.day) { point in
                                LineMark(x: .value("Day", point.day),
                                         y: .value("kg", point.kg))
                                    .foregroundStyle(Color.gozLime)
                                PointMark(x: .value("Day", point.day),
                                          y: .value("kg", point.kg))
                                    .foregroundStyle(Color.gozLime)
                            }
                        }
                        .frame(height: 200)
                    }
                    LabeledRow(title: "Start", value: String(format: "%.1f kg", store.data.startWeight))
                    LabeledRow(title: "Latest", value: String(format: "%.1f kg", latestWeight))
                    LabeledRow(title: "Change",
                               value: String(format: "%+.1f kg", latestWeight - store.data.startWeight))
                    LabeledRow(title: "Goal", value: String(format: "%.1f kg", store.data.goalWeight))
                }

                Section("Water — last 7 days") {
                    Chart {
                        ForEach(recentWater, id: \.day) { point in
                            BarMark(x: .value("Day", point.day),
                                    y: .value("ml", point.ml))
                                .foregroundStyle(Color.gozCyan)
                        }
                        RuleMark(y: .value("Goal", store.data.waterGoalMl))
                            .foregroundStyle(.secondary)
                            .lineStyle(StrokeStyle(dash: [4, 4]))
                    }
                    .frame(height: 160)
                }
            }
            .navigationTitle("Stats")
        }
    }
}
