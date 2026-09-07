import AppKit
import Combine

@MainActor
final class AppState: ObservableObject {
    @Published var currentImage: NSImage?
    @Published var currentPhoto: CuratedPhoto?
    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var mood: Mood {
        didSet {
            UserDefaults.standard.set(mood.rawValue, forKey: "mood")
            Task { await refresh() }
        }
    }

    @Published var refreshInterval: RefreshInterval {
        didSet {
            UserDefaults.standard.set(refreshInterval.rawValue, forKey: "refreshInterval")
            scheduleTimer()
        }
    }

    private let curation = CurationService(manifestURL: AppConfig.manifestURL)
    private let wallpaper = WallpaperManager()
    private var timer: Timer?

    init() {
        let storedMood = UserDefaults.standard.string(forKey: "mood").flatMap { raw in
            Mood.allCases.first { $0.rawValue == raw }
        }
        self.mood = storedMood ?? .random

        let storedInterval = UserDefaults.standard.double(forKey: "refreshInterval")
        self.refreshInterval = RefreshInterval(rawValue: storedInterval) ?? .oneHour

        scheduleTimer()
    }

    func scheduleTimer() {
        timer?.invalidate()
        timer = nil
        guard refreshInterval.rawValue > 0 else { return }
        timer = Timer.scheduledTimer(withTimeInterval: refreshInterval.rawValue, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.refresh()
            }
        }
    }

    func refresh() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let photo = try await curation.randomPhoto(for: mood)
            let image = try await wallpaper.downloadAndSet(urlString: photo.imageURL, photoID: photo.id)
            currentImage = image
            currentPhoto = photo
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
