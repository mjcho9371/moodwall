import Foundation

enum AppConfig {
    /// Raw GitHub URL for the curated photo manifest that `scripts/sync_collections.py` publishes.
    /// Update the owner/repo once this project is pushed to GitHub.
    static let manifestURL = URL(
        string: "https://raw.githubusercontent.com/mjcho9371/moodwall/main/curation/manifest.json"
    )!
}
