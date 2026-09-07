# Moodwall — 브라우저 확장 (새 탭)

새 탭을 열 때마다 큐레이션된 무드 사진 + 실시간 시계(`09:44:12 AM` 형식)를 보여주는 확장. macOS 앱과 같은 [curation/manifest.json](../curation/manifest.json)을 그대로 읽어온다.

## 설정

[newtab.js](newtab.js) 상단의 `MANIFEST_URL`을 본인 GitHub 저장소 경로로 바꾼다 (macOS 앱의 `AppConfig.swift`와 동일한 값):

```js
const MANIFEST_URL = "https://raw.githubusercontent.com/<GITHUB_USERNAME>/Moodwall/main/curation/manifest.json";
```

## 크롬에서 테스트

1. `chrome://extensions` 접속
2. 우측 상단 "개발자 모드" 켜기
3. "압축해제된 확장 프로그램을 로드합니다" → 이 `extension/` 폴더 선택
4. 새 탭(Cmd+T)을 열면 바로 적용됨

## 사파리로 포팅

Apple 공식 변환 도구로 Xcode 프로젝트를 생성한다:

```bash
xcrun safari-web-extension-converter extension/
```

생성된 Xcode 프로젝트를 빌드하면 Safari 확장으로 실행된다. 사파리는 새 탭 오버라이드 API가 크롬과 다르게 동작할 수 있어 (`chrome_url_overrides` 미지원 가능성), 변환 후 Safari 확장 환경설정에서 활성화하고 직접 새 탭에서 확인이 필요하다.

## 로컬에서 미리보기 (확장으로 설치 안 하고)

```bash
cd extension
python3 -m http.server 8743
```

브라우저에서 `http://localhost:8743/newtab.html` 접속. (단, `chrome.storage`는 실제 확장 컨텍스트에서만 동작하므로 이 모드에서는 무드 선택이 저장되지 않고, 매번 "랜덤"으로 초기화됨.)

## 알려진 한계

- `curation/manifest.json`이 아직 없거나 로드 실패하면 배경은 어두운 그라디언트로 대체되고, 시계는 정상 동작한다.
- Unsplash 사진 속성상 다운로드 트리거를 호출하지 못하는 건 macOS 앱과 동일한 한계다 (README.md 참고).
