import SwiftUI

struct MenuBarContentView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        if let photo = state.currentPhoto {
            Link("📷 \(photo.photographer)", destination: creditURL(photo.photographerURL))
            Link("Unsplash에서 보기", destination: creditURL(photo.unsplashURL))
            Divider()
        }

        if state.isLoading {
            Text("불러오는 중…")
        }

        if let error = state.errorMessage {
            Text(error)
        }

        Button("다음 배경화면") {
            Task { await state.refresh() }
        }
        .disabled(state.isLoading)

        Menu("무드: \(state.mood.label)") {
            ForEach(Mood.allCases) { mood in
                Button {
                    state.mood = mood
                } label: {
                    if state.mood == mood {
                        Label(mood.label, systemImage: "checkmark")
                    } else {
                        Text(mood.label)
                    }
                }
            }
        }

        Menu("자동 변경: \(state.refreshInterval.label)") {
            ForEach(RefreshInterval.allCases) { interval in
                Button {
                    state.refreshInterval = interval
                } label: {
                    if state.refreshInterval == interval {
                        Label(interval.label, systemImage: "checkmark")
                    } else {
                        Text(interval.label)
                    }
                }
            }
        }

        Divider()

        Button("종료") {
            NSApplication.shared.terminate(nil)
        }
    }

    private func creditURL(_ base: String) -> URL {
        URL(string: base + "?utm_source=moodwall&utm_medium=referral")
            ?? URL(string: "https://unsplash.com")!
    }
}
