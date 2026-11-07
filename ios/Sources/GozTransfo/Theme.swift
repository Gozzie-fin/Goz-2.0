import SwiftUI

extension Color {
    /// Build a colour from a 0xRRGGBB literal.
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }

    static let gozLime = Color(hex: 0x30D158)
    static let gozCyan = Color(hex: 0x64D2FF)
    static let gozOrange = Color(hex: 0xFF9F0A)

    /// Card surface and page background, using the system palette on iOS.
    static var gozCard: Color {
        #if os(iOS)
        Color(uiColor: .secondarySystemBackground)
        #else
        Color.gray.opacity(0.15)
        #endif
    }

    static var gozPage: Color {
        #if os(iOS)
        Color(uiColor: .systemGroupedBackground)
        #else
        Color.gray.opacity(0.05)
        #endif
    }
}

extension View {
    /// Integer keypad on iPhone; no-op on other platforms.
    @ViewBuilder
    func numberPad() -> some View {
        #if os(iOS)
        self.keyboardType(.numberPad)
        #else
        self
        #endif
    }

    /// Decimal keypad on iPhone; no-op on other platforms.
    @ViewBuilder
    func decimalPad() -> some View {
        #if os(iOS)
        self.keyboardType(.decimalPad)
        #else
        self
        #endif
    }

    /// Inline title on iPhone; no-op on other platforms.
    @ViewBuilder
    func inlineTitle() -> some View {
        #if os(iOS)
        self.navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }
}

/// Rounded surface used for dashboard cards.
struct Card<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(Color.gozCard)
            )
    }
}
