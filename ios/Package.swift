// swift-tools-version:5.9
// Goz-Transfo native iOS app (SwiftUI).
// Open this folder in Xcode (File > Open… > select Package.swift), pick an
// iPhone simulator or device, and press Run.

import PackageDescription

let package = Package(
    name: "GozTransfo",
    platforms: [
        .iOS(.v17),
        .macOS(.v14), // lets `swift build` type-check on a Mac during development
    ],
    targets: [
        .executableTarget(
            name: "GozTransfo",
            path: "Sources/GozTransfo",
            resources: [.process("Resources")]
        ),
    ]
)
