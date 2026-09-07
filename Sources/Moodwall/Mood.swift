import Foundation

/// `rawValue` doubles as the key used in the curated manifest's `moods` dictionary,
/// so it must stay in sync with whatever keys `scripts/sync_collections.py` writes.
enum Mood: String, CaseIterable, Identifiable, Codable {
    case calm
    case energetic
    case nature
    case minimal
    case dark
    case cozy
    case ocean
    case fall
    case winter
    case random

    var id: String { rawValue }

    var label: String {
        switch self {
        case .calm: return "차분함"
        case .energetic: return "활기참"
        case .nature: return "자연"
        case .minimal: return "미니멀"
        case .dark: return "다크"
        case .cozy: return "포근함"
        case .ocean: return "바다"
        case .fall: return "가을"
        case .winter: return "겨울"
        case .random: return "랜덤"
        }
    }
}

enum RefreshInterval: TimeInterval, CaseIterable, Identifiable, Codable {
    case off = 0
    case thirtyMinutes = 1800
    case oneHour = 3600
    case threeHours = 10800
    case daily = 86400

    var id: TimeInterval { rawValue }

    var label: String {
        switch self {
        case .off: return "끄기"
        case .thirtyMinutes: return "30분마다"
        case .oneHour: return "1시간마다"
        case .threeHours: return "3시간마다"
        case .daily: return "하루마다"
        }
    }
}
