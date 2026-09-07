import AppKit

enum WallpaperError: LocalizedError {
    case downloadFailed
    case setFailed

    var errorDescription: String? {
        switch self {
        case .downloadFailed: return "이미지를 다운로드하지 못했습니다."
        case .setFailed: return "배경화면을 적용하지 못했습니다."
        }
    }
}

final class WallpaperManager {
    private let cacheDirectory: URL = {
        let base = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Moodwall", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }()

    @MainActor
    func downloadAndSet(urlString: String, photoID: String) async throws -> NSImage {
        guard let url = URL(string: urlString) else { throw WallpaperError.downloadFailed }

        let (data, _) = try await URLSession.shared.data(from: url)
        let fileURL = cacheDirectory.appendingPathComponent("\(photoID).jpg")
        try data.write(to: fileURL)

        guard let image = NSImage(contentsOf: fileURL) else { throw WallpaperError.downloadFailed }

        for screen in NSScreen.screens {
            try NSWorkspace.shared.setDesktopImageURL(fileURL, for: screen, options: [:])
        }

        return image
    }
}
