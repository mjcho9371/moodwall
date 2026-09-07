import Foundation

struct CuratedPhoto: Decodable, Identifiable, Equatable {
    let id: String
    let imageURL: String
    let photographer: String
    let photographerURL: String
    let unsplashURL: String
}

struct CurationManifest: Decodable {
    let updatedAt: String
    let moods: [String: [CuratedPhoto]]
}

enum CurationError: LocalizedError {
    case manifestUnavailable
    case noPhotosForMood

    var errorDescription: String? {
        switch self {
        case .manifestUnavailable:
            return "큐레이션 목록을 불러오지 못했습니다."
        case .noPhotosForMood:
            return "이 무드에 등록된 사진이 아직 없습니다."
        }
    }
}

final class CurationService {
    private let manifestURL: URL
    private var cachedManifest: CurationManifest?

    init(manifestURL: URL) {
        self.manifestURL = manifestURL
    }

    func loadManifest(forceRefresh: Bool = false) async throws -> CurationManifest {
        if !forceRefresh, let cached = cachedManifest {
            return cached
        }

        var request = URLRequest(url: manifestURL)
        request.cachePolicy = .reloadIgnoringLocalCacheData

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw CurationError.manifestUnavailable
        }

        let manifest = try JSONDecoder().decode(CurationManifest.self, from: data)
        cachedManifest = manifest
        return manifest
    }

    func randomPhoto(for mood: Mood) async throws -> CuratedPhoto {
        let manifest = try await loadManifest()

        let pool: [CuratedPhoto]
        if mood == .random {
            pool = manifest.moods.values.flatMap { $0 }
        } else {
            pool = manifest.moods[mood.rawValue] ?? []
        }

        guard let photo = pool.randomElement() else { throw CurationError.noPhotosForMood }
        return photo
    }
}
