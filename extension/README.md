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

## Google Calendar / Gmail 위젯 설정

새 탭 우측 상단 ⚙ 버튼에서 "다음 일정 표시" / "안읽은 메일 표시"를 켜면 카드가 뜨는데, 그전에 Google Cloud에서 OAuth 클라이언트를 한 번 등록해야 한다.

이 확장은 `manifest.json`에 `"key"`를 고정해뒀기 때문에 확장 ID가 항상 다음 값으로 고정된다:

```
kjioonmdijinccfpmmcmjjkicfjommjp
```

1. [Google Cloud Console](https://console.cloud.google.com/) → 새 프로젝트 생성 (또는 기존 프로젝트 사용)
2. **API 및 서비스 → 라이브러리**에서 **Gmail API**, **Google Calendar API** 둘 다 사용 설정
3. **API 및 서비스 → OAuth 동의 화면**
   - User Type: External (개인 Gmail 계정이면), 게시 상태는 **Testing**으로 둬도 됨
   - 범위(Scopes)에 `gmail.readonly`, `calendar.readonly` 추가
   - **테스트 사용자**에 본인 Google 계정 이메일 추가 (안 하면 로그인 시 차단됨)
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **Chrome 앱** (Chrome App/Extension)
   - 애플리케이션 ID(항목 ID)에 위 확장 ID(`kjioonmdijinccfpmmcmjjkicfjommjp`) 입력
   - 생성되면 나오는 **클라이언트 ID** 복사 (`...apps.googleusercontent.com` 형태)
5. [manifest.json](manifest.json)의 `oauth2.client_id` 값을 그 클라이언트 ID로 교체
6. `chrome://extensions`에서 Moodwall **삭제 후 재설치** (권한/키가 바뀌었으므로 새로고침만으로는 부족함) → `/Users/minjungcho/Documents/GitHub/Moodwall/extension` 폴더로 다시 로드
7. 새 탭 → ⚙ → 체크박스 켜기 → "Google 계정 연결" 클릭 → 팝업에서 로그인/동의

주의: Testing 상태의 앱은 Google이 "확인되지 않은 앱" 경고를 띄우는데, 테스트 사용자로 등록한 본인 계정이면 "고급 → OO(안전하지 않음)으로 이동"을 눌러 계속 진행할 수 있다. 개인 용도로만 쓸 거면 이 상태로 계속 써도 무방하다 (앱을 다른 사람에게 배포해서 확인 안 된 앱 경고 없이 쓰게 하려면 Google의 앱 인증 심사가 별도로 필요함).

## 알려진 한계

- `curation/manifest.json`이 아직 없거나 로드 실패하면 배경은 어두운 그라디언트로 대체되고, 시계는 정상 동작한다.
- Unsplash 사진 속성상 다운로드 트리거를 호출하지 못하는 건 macOS 앱과 동일한 한계다 (README.md 참고).
- `chrome.bookmarks`, `chrome.identity` 등은 실제 설치된 확장에서만 동작한다 — 로컬 `python3 -m http.server` 미리보기에서는 항상 빈 상태로 표시된다.
- Google 로그인 세션은 크롬 프로필의 Google 계정과 연동된다. 계정을 바꾸고 싶으면 설정 패널의 "연결 해제" 후 다시 연결한다.
