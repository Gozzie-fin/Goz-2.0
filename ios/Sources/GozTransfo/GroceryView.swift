import SwiftUI

struct GroceryView: View {
    @EnvironmentObject private var store: Store
    @State private var mode = 0 // 0 = suggested list, 1 = spending log

    @State private var itemName = ""
    @State private var quantity = ""
    @State private var price: Double?
    @State private var storeName = ""

    private var rawDay: Int { Plan.dayNumber(startDate: store.data.startDate) }
    private var day: Int { min(max(rawDay, 1), store.data.targetDays) }
    private var phase: Phase { Plan.phase(for: day) }
    private var currentWeek: Int { Plan.week(for: day) }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("View", selection: $mode) {
                        Text("Suggested").tag(0)
                        Text("My Log").tag(1)
                    }
                    .pickerStyle(.segmented)
                }

                if mode == 0 {
                    suggestedSections
                } else {
                    logSections
                }
            }
            .navigationTitle("Grocery")
        }
    }

    // MARK: - Suggested list

    @ViewBuilder
    private var suggestedSections: some View {
        Section {
            Text(phaseBlurb)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        ForEach(BundledData.groceryCategories(phase: phase.id)) { category in
            Section(category.cat) {
                ForEach(category.items) { item in
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text(item.name).font(.headline)
                            Spacer()
                            Text(item.est)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Text("\(item.qty) · \(item.why)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private var phaseBlurb: String {
        switch phase.id {
        case 1: return "Foundation phase — stock simple, affordable staples you'll actually cook."
        case 2: return "Building phase — more variety, more protein, more intensity in the kitchen."
        case 3: return "Definition phase — high protein, minimal carbs, maximum vegetables."
        default: return "Peak phase — ultra-clean eating. Only the leanest proteins and greens."
        }
    }

    // MARK: - Spending log

    private var canAdd: Bool {
        !itemName.trimmingCharacters(in: .whitespaces).isEmpty && (price ?? 0) > 0
    }

    @ViewBuilder
    private var logSections: some View {
        Section("Add purchase") {
            TextField("Item", text: $itemName)
            TextField("Quantity (e.g. 2 packs)", text: $quantity)
            TextField("Price", value: $price, format: .number)
                .decimalPad()
            TextField("Store (optional)", text: $storeName)
            Button("Add to log", action: addPurchase)
                .disabled(!canAdd)
        }

        Section("Totals") {
            LabeledRow(title: "This week", value: money(total(where: { $0.week == currentWeek })))
            LabeledRow(title: "Last 4 weeks", value: money(total(where: { $0.week >= currentWeek - 3 })))
            LabeledRow(title: "All time", value: money(total(where: { _ in true })))
        }

        ForEach(weekNumbers, id: \.self) { week in
            Section("Week \(week)") {
                ForEach(entries(in: week)) { entry in
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(entry.name)
                            Spacer()
                            Text(money(entry.price)).foregroundStyle(.secondary)
                        }
                        Text([entry.qty, entry.store].filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .swipeActions {
                        Button(role: .destructive) {
                            store.data.groceryLogs.removeAll { $0.id == entry.id }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }

    private var weekNumbers: [Int] {
        Array(Set(store.data.groceryLogs.map(\.week))).sorted(by: >)
    }

    private func entries(in week: Int) -> [GroceryEntry] {
        store.data.groceryLogs.filter { $0.week == week }
    }

    private func total(where include: (GroceryEntry) -> Bool) -> Double {
        store.data.groceryLogs.filter(include).reduce(0) { $0 + $1.price }
    }

    private func money(_ value: Double) -> String {
        value.formatted(.currency(code: Locale.current.currency?.identifier ?? "USD"))
    }

    private func addPurchase() {
        guard canAdd, let amount = price else { return }
        store.data.groceryLogs.append(GroceryEntry(
            week: currentWeek,
            day: day,
            name: itemName.trimmingCharacters(in: .whitespaces),
            qty: quantity.trimmingCharacters(in: .whitespaces),
            price: amount,
            store: storeName.trimmingCharacters(in: .whitespaces)
        ))
        itemName = ""
        quantity = ""
        price = nil
        storeName = ""
    }
}
