# Moodwall

무드(분위기)를 고르면 큐레이션된 사진으로 macOS 배경화면을 자동으로 바꿔주는 메뉴바 앱.

## 아키텍처

- **큐레이션**: unsplash.com에서 무드별 Collection을 만들고 사진을 직접 골라 넣는다.
- **배포**: `scripts/sync_collections.py`가 각 Collection의 사진을 읽어 `curation/manifest.json`으로 굽는다. 이 파일을 GitHub에 커밋/푸시하면 끝.
- **앱**: 배포된 앱은 `curation/manifest.json`을 raw GitHub URL로 실시간으로 읽어온다. **Unsplash API 키가 앱 안에는 전혀 필요 없다** — 이미지도 공개 CDN URL이라 그냥 받아오면 된다.

즉, API 키는 큐레이션할 때(사진작가 본인 컴퓨터에서 스크립트 돌릴 때) 딱 한 번만 쓰이고, 앱을 설치하는 다른 사람들은 아무 설정 없이 바로 쓸 수 있다.

## 큐레이션 설정

1. [unsplash.com](https://unsplash.com)에 로그인해서 무드별로 Collection 생성 (예: "Moodwall - Calm", "Moodwall - Energetic" ...) 하고 사진을 추가한다.
2. 각 Collection 페이지 URL에서 ID를 확인해 [curation/collections.json](curation/collections.json)에 채워 넣는다.
   ```json
   { "calm": "abcd1234", "energetic": "wxyz5678", ... }
   ```
3. Unsplash Access Key를 환경변수로 넣고 동기화 스크립트 실행:
   ```bash
   UNSPLASH_ACCESS_KEY=your_access_key python3 scripts/sync_collections.py
   ```
   → `curation/manifest.json`이 갱신된다.
4. 커밋 & 푸시. 그 순간부터 이미 설치된 모든 앱이 새 사진을 받는다 (앱 재배포 불필요).

Collection에 사진을 추가/삭제할 때마다 3~4번만 반복하면 된다.

## 앱 설정 (한 번만)

[Sources/Moodwall/AppConfig.swift](Sources/Moodwall/AppConfig.swift)의 `manifestURL`을 본인 GitHub 저장소 경로로 바꾼다:

```swift
static let manifestURL = URL(string: "https://raw.githubusercontent.com/<GITHUB_USERNAME>/Moodwall/main/curation/manifest.json")!
```

## 개발 중 실행

```bash
swift run
```

## 실제 .app으로 빌드 & 배포

```bash
./scripts/build_app.sh
open Moodwall.app
```

Dock에 안 뜨고 메뉴바에만 상주한다. 다른 사람에게 배포하려면 `Moodwall.app`을 압축해서 공유하면 된다 (Apple 개발자 서명이 없으니 받는 사람은 처음 실행 시 "확인되지 않은 개발자" 경고를 우클릭 → 열기로 넘겨야 함).

## 기능

- 무드별(차분함/활기참/자연/미니멀/다크/포근함/바다/랜덤) 큐레이션된 사진 중 랜덤 적용
- 수동 "다음 배경화면" 또는 자동 주기(30분/1시간/3시간/하루) 변경
- 사진작가 크레딧 + Unsplash 원본 링크 표시

## 크롬/사파리 새 탭 확장

같은 큐레이션 manifest를 재사용하는 브라우저 확장이 [extension/](extension/)에 있다. 자세한 설정/설치 방법은 [extension/README.md](extension/README.md) 참고.

## 알려진 한계

- Unsplash API 가이드라인은 사진이 "사용"될 때 download 엔드포인트를 호출하도록 요구하는데, 배포된 앱은 API 키가 없어서 이를 직접 호출하지 못한다. 개인/소규모 배포 단계에서는 크게 문제되지 않지만, 나중에 규모가 커지면 얇은 서버리스 프록시를 하나 둬서 이 호출을 대신 해주는 걸 고려할 것.

## 다음에 추가하면 좋은 것들

- 로그인 시 자동 실행 (`SMAppService`)
- GitHub Actions로 동기화 스크립트 자동화 (cron)
- 즐겨찾기/최근 배경화면 히스토리
- 여러 모니터별 다른 사진 적용
- 크롬/사파리 새 탭 확장 (같은 `manifest.json` 재사용)
