# App Store 출시

iOS 앱을 App Store에 올리는 순서, 지금 상태, 제출 전에 확인할 것. 제품·서버·운영은 `docs/PROJECT.md`.

인증 키·private key·토큰·Team ID 같은 값은 이 문서와 Git에 적지 않는다. 값은 각 콘솔(Apple, Firebase, EAS, 서버 `.env`)에만 둔다.
콘솔 쪽 "완료"는 운영자가 직접 확인한 것이고 코드로는 검증할 수 없다.

## 진행 상태

| 단계 | 담당 | 상태 |
| --- | --- | --- |
| Apple Developer Program 가입, App ID(`com.ottuck.buddychat`), Sign in with Apple 켜기 | 운영자 | 완료 |
| Sign in with Apple 키, Services ID, Firebase Apple 제공업체 | 운영자 | 완료 |
| 아이폰 Google 로그인: `@react-native-google-signin/google-signin`이 든 빌드(Firebase iOS 앱의 OAuth client 사용). production 빌드 4에서 확인 | 운영자 | 완료 |
| 아이폰 사진 보내기: `expo-image-picker`·`expo-image-manipulator`가 든 빌드. production 빌드 4에서 확인(그 모듈이 없는 예전 빌드는 사진 버튼만 숨기고 받은 사진은 보인다) | 운영자 | 완료 |
| App Store Connect 앱 개인정보(아래 4의 항목) 게시 | CLI | 완료 |
| 웹 Apple 로그인: Services ID에 웹 도메인(`buddy-chat-67e35.firebaseapp.com`)과 return URL(`https://buddy-chat-67e35.firebaseapp.com/__/auth/handler`) | 운영자 | 예정 |
| Firebase iOS 앱(번들 ID `com.ottuck.buddychat`) 등록. 앱의 Apple 토큰은 수신자가 번들 ID라 이 등록이 없으면 `auth/invalid-credential` | CLI | 완료 |
| App Store Connect 앱 등록 | 운영자 | 완료 |
| 코드 쪽 준비(아래) | 코드 | 완료 |
| EAS iOS 개발용 빌드·설치 | 운영자(Apple 인증, 기기 등록) | 완료 |
| iPhone 실기기 검증 | 운영자 조작, 결과에 따른 코드 수정 | 완료 |
| production 빌드·TestFlight 업로드(1.0.0 빌드 4). 배포 인증서·App Store 프로필·App Store Connect API 키는 EAS에 있다 | 운영자 인증, CLI는 지원 | 완료 |
| TestFlight로 실기기 확인(빌드 4) | 운영자 | 완료 |
| 스토어 정보 입력·심사 제출(1.0 빌드 4). 제출하는 동안 자동 앱 업데이트를 끄고 승인 뒤 다시 켠다 | 문안은 지원, 최종 확인·제출은 운영자 | 리젝(2026-11-04, 아래) |
| 리젝 대응 뒤 1.0 다시 제출: main으로 production 빌드 5를 만들어 같은 버전(1.0.0)으로 낸다. 쌓인 앱 변경·번체 중국어·"Puny Chat" 이름이 함께 들어가 빌드 4용 업데이트는 보내지 않는다. 새 스크린샷, 번체 중국어 현지화, App Store Connect 메시지 답장(18+ 필요 여부 질문) | 운영자(빌드·제출), 문안은 지원 | 심사 대기 중(2026-11-04 다시 제출) |
| 직업 이벤트 켜기(`docs/PROJECT.md`의 직업 이벤트): 승인 뒤 `pnpm app-update:on`, 서버 `BuddyProperties`의 `gifts` 기본값을 `true`로 바꿔 배포한다(빌드 5에는 `buddyEvent.GIFT` 문구가 있다) | 운영자(업데이트), 코드(스위치) | 승인 대기 |
| 일본 전기통신사업 届出: 1:1 채팅은 "다른 사람의 통신 중개"지만, 총무성 참입 매뉴얼(追補版, 2023-01 개정)은 "営む"를 요금·광고 등으로 그 서비스 자체에서 이익을 얻으려는 것으로 보고 "無償・原価ベース"는 빼며, 개인이 운영하는 무료·무광고 메일을 "営む에 해당하지 않음(규율 대상 외)" 사례로 든다. 그래서 광고·결제·수익이 없는 지금은 届出 없이 일본에도 판매한다. **광고·결제·후원 등 수익을 붙이기 전에 届出(e-Gov)를 먼저 낸다** | 운영자 | 해당 없음(수익 없음) |

## 1.0 리젝 (2026-11-04, 빌드 4)

첫 제출은 15일 대기 끝에 iPad Air에서 심사되어 세 가지로 리젝됐다. 대응은 빌드 5에 들어간다.

| 지침 | 지적 | 대응 |
| --- | --- | --- |
| 4.0 Design (Sign in with Apple) | Apple로 로그인한 뒤 이름을 다시 입력하게 한다 | Apple 시트에서 이름을 받아 그대로 쓰고 이름 화면을 건너뛴다. 못 받으면 기본 이름(`docs/PROJECT.md` 처음 시작하기) |
| 2.3.3 Accurate Metadata | 6.3인치 스크린샷 대부분이 실제 앱 화면이 아니다(홍보 문구·폰 틀·장면 콜라주) | 실제 앱 화면이 대부분인 스크린샷으로 교체(`docs/app-store`) |
| 1.2 User-Generated Content | 익명으로 콘텐츠를 올릴 수 있는데 대책이 없다. 18+ 등급, 약관(EULA) 동의, 필터, 신고, 차단, 즉시 삭제, 24시간 내 조치, 앱 안 연락처를 요구 | 다른 사람과 연결은 계정 연결 후만(익명 대화 없앰), 무관용 이용약관 직접 동의, 금칙어 가리기, 24시간 내 조치와 계정 사용 중지(운영). 신고·차단·즉시 삭제·연락처는 이미 있다. 18+는 답장으로 다시 확인한다 |

2026년 2월부터 Guideline 1.2가 "무작위·익명 채팅" 앱을 App Store에서 받지 않는다고 적는다. 심사 메모와 답장에서는 공개 피드·검색·모르는 사람과의
연결이 없고, 다른 사람과는 계정이 있어야 이어진다는 점을 먼저 밝힌다.

## 코드 쪽 준비 (완료)

- Sign in with Apple: `app.json`의 `ios.usesAppleSignIn`, `expo-apple-authentication` 플러그인, 로그인·연결·삭제(`lib/social-auth/apple.ios.ts`).
  계정 삭제 때 Apple 토큰을 취소한다.
- 앱 안 계정 삭제(Guideline 5.1.1(v)), 개인정보처리방침·지원 페이지(로그인 없이, 앱의 언어로), 문의·상대 신고·내보내기.
- 푸시: `expo-notifications`, EAS projectId 연결. 아이콘·스플래시: `app/assets/README.md`.
- 수출 규정: `ios.infoPlist`의 `ITSAppUsesNonExemptEncryption: false`(표준 암호화만 쓴다. 업로드마다 묻지 않게).
- `pnpm dlx expo-doctor` 21/21(SDK 57 최신 패치). 패치는 `app/`에서 `pnpm exec expo install --fix`로 맞춘다. 막 나온 패치는 pnpm의
  최소 공개 기간(하루) 안이라 설치되지 않는다. 기간을 우회하는 `minimumReleaseAgeExclude`가 `pnpm-workspace.yaml`에 생기면 되돌리고 기다린다.
- EAS Update(`expo-updates`): 아래 앱 업데이트.
- EAS development·production 환경에 공개 클라이언트 설정 5개(`EXPO_PUBLIC_API_URL`, Firebase 4개), `eas.json`에서 환경을 고른다.
- Gmail 발송(OAuth 앱 Production, `gmail.send`)과 서버 환경변수 설정.

## 순서

1. **개발용 빌드.** 첫 빌드 전에 `app.json`·의존성을 확정해 빌드 횟수를 아낀다(무료 플랜은 월 제한). `app/`에서 `pnpm dlx expo-doctor`가 21/21인지 본다.
   ```bash
   npx eas-cli device:create
   ```
   ```bash
   npx eas-cli build --profile development --platform ios
   ```
   완료되면 링크로 설치하고 개발자 모드를 켠다.
2. **실기기 검증.** 웹·서버 배포 성공은 iOS 바이너리 검증이 아니다.
   - Apple 로그인·계정 연결·계정 삭제(Services ID·Team ID·Key ID·키 연결 확인 포함)
   - Google 로그인·계정 연결·계정 삭제, 웹에서 Google로 연결한 계정이 앱에서 같은 Buddy로 열리는지
   - 앱을 닫은 상태의 푸시, 알림을 눌러 돌아오기(EAS APNs 키)
   - 백그라운드 복귀·재연결, 키보드·스크롤, 아이콘·스플래시, 설정의 선택창
   - 문의 접수 후 운영자 수신함에 알림이 실제로 오는지
3. **TestFlight.** `app/`에서 production 빌드를 만들고 끝나면 App Store Connect에 바로 올린다(`--auto-submit`).
   ```bash
   npx eas-cli build --profile production --platform ios --auto-submit
   ```
   빌드 번호는 EAS가 올린다(`appVersionSource: remote`). 첫 빌드 때 Apple 로그인으로 만든 배포 인증서·App Store 프로필·
   App Store Connect API 키가 EAS에 있고 `eas.json`에 `ascAppId`가 있어서, 다음부터는 `--non-interactive`로도 빌드·업로드된다.
   Apple 처리(5–10분)가 끝나면 메일이 오고 TestFlight 탭에 보인다. 내부 테스터("Team (Expo)" 그룹)는 심사 없이 설치한다.
4. **App Store Connect 정보.**
   - 개인정보처리방침 `https://puny-chat.com/privacy`, 지원 URL `https://puny-chat.com/support`
   - 앱 이름: 스토어와 홈 화면 모두 "Puny Chat"(홈 화면은 `app.json`의 `ios.infoPlist.CFBundleDisplayName`, 빌드 5부터. 빌드 4는 `puny-chat`).
   - 판매 지역: 중국 본토와 EU를 뺀 전 세계. 중국 본토는 ICP 등록이 필요하고, EU는 DSA 판매자 신고를 하지 않는다.
   - 스토어 언어: 기본 언어 영어(그 밖의 나라는 영어 페이지), 일본어·한국어·번체 중국어(대만) 현지화. 설명·키워드·스크린샷을 언어마다 따로 넣는다.
     번체 중국어는 1.0을 빌드 5로 다시 낼 때 함께 넣는다(이름·부제·설명은 버전과 같이 심사된다). 스토어의 '언어' 표시는 `app.json`의
     `CFBundleLocalizations`에 zh-Hant가 든 빌드 5부터다.
     스크린샷은 `docs/app-store/{ja,ko,en,zh-Hant}`의 6.3인치(1206×2622) 6장을 파일 이름 순서로 올린다. 웹 빌드의 구경하기(`/demo`)와
     `/preview` 장면을 그 언어로 찍은 실제 앱 화면 그대로다(홍보 문구·폰 틀·장면 콜라주는 2.3.3으로 리젝되어 쓰지 않는다). 이름·부제·프로모션 텍스트·키워드·설명은 같은 폴더의 `listing.txt`.
     기능이 바뀌면 설명도 실제 앱과 맞춘다(없는 기능을 적지 않는다, Guideline 2.3). 설명에는 💩·♨ 같은 기호를 넣을 수 없다(저장이 거절된다).
   - 카테고리: 소셜 네트워킹, 추가로 엔터테인먼트. 가격은 무료. 콘텐츠 권한: 타사 콘텐츠 없음.
   - 연령 등급: 설문은 사용자 생성 콘텐츠·메시지 및 채팅만 "예"(나머지 없음)로 4+가 나오지만, 처리방침·이용약관대로 13세 이상으로 올렸다.
     1.0 리젝에서 Apple이 18+를 요구했다(익명 게스트끼리의 대화 때문으로 본다). 계정 요구로 익명 대화를 없앤 빌드 5와 함께 답장으로 다시
     확인하고, 그래도 요구하면 18+로 올린다.
   - 앱 개인정보(처리방침의 실제 수집 내용과 맞춘다. 모두 추적에 쓰지 않음, 사용자와 연결됨):
     이메일 주소(계정 연결 때 Google·Apple), 이메일 또는 문자 메시지, 사진 또는 비디오, 고객 지원(문의·신고), 기타 사용자 콘텐츠(Buddy 이름 등),
     사용자 ID, 기기 ID(푸시 토큰)는 앱 기능. 제품 상호작용은 분석과 앱 기능(이용 통계는 날짜별 합계지만 최근 이용 시각이 사용자에게 붙어 있다).
   - 심사 메모: `docs/PROJECT.md` 운영의 "심사 설명에 쓸 사실"을 영어로 적는다(초대로만 이어지는 1:1 채팅, 모르는 사람과의 연결 없음,
     다른 사람과는 계정 연결 후, 약관 동의, 금칙어 가리기, 신고·차단·즉시 삭제, 24시간 내 조치, 앱 안 연락처).
     심사자는 계정 없이 "시작하기" → 이름 → 알 이름("버디 깨우기")으로 혼자 쓸 수 있고, 둘이 대화하는 모습은 첫 화면의 구경하기에서 볼 수 있으며,
     친구 초대·참가는 Apple로 로그인하면 된다고 적는다.
5. **제출.** 운영자가 최종 확인하고 직접 제출한다.

## 앱 업데이트 (EAS Update)

`expo-updates`가 들어간 빌드부터 JS·그림·번역 변경을 심사 없이 보낸다. 앱은 켤 때 업데이트를 받아 두고 다음 실행에 적용한다.
서버 변경은 지금처럼 배포만 하면 모든 앱에 바로 적용된다(옛 앱도 계속 부르므로 API는 호환을 지킨다). 웹은 상관없다.

- **채널.** `eas.json`의 preview·production 빌드가 같은 이름의 채널을 본다. 개발용 빌드는 Metro로 바로 받는다.
- **runtimeVersion은 `appVersion` 정책.** 업데이트는 `app.json`의 `version`(지금 1.0.0)이 같은 빌드에만 간다. 네이티브가 바뀌면(패키지 추가·업그레이드,
  config plugin, `app.json`의 네이티브 설정) `version`을 올리고 새로 빌드해 심사받는다. 올리지 않으면 옛 빌드에 맞지 않는 업데이트가 가서 앱이 깨질 수 있다.
- **자동으로 보내기.** `main` push에서 `app/`이 바뀌었고 배포가 성공하면 CI가 `.github/workflows/app-update.yml`로 production 채널에
  보낸다. 저장소 변수 `EAS_AUTO_UPDATE`가 `true`일 때만 돈다(끄면 건너뜀). 시크릿 `EXPO_TOKEN`(expo.dev → Account Settings →
  Access Tokens)이 필요하다. 메시지는 짧은 sha와 합친 작업의 커밋 제목. Actions의 "App update"를 손으로 돌리면 스위치와 상관없이 보낸다.
  `app/`에서(`gh` 로그인 필요):

  | 명령 | 하는 일 |
  | --- | --- |
  | `pnpm app-update:status` | 스위치 확인(`true` / `false`) |
  | `pnpm app-update:on` / `pnpm app-update:off` | 자동 업데이트 켜기 / 끄기 |
  | `pnpm app-update` | 지금 main을 한 번 보내기("App update" 실행, 스위치와 상관없이) |
- **손으로 보내기.** main CI·웹 배포를 확인한 뒤, 같은 커밋의 `app/` 폴더에서(저장소 최상위에서는 "Run this command inside a project directory"로 실패한다):
  ```bash
  npx eas-cli update --channel production --environment production --message "방 소품 탭 반응"
  ```
  `--environment`로 EAS의 production 환경변수(`EXPO_PUBLIC_*`)를 쓴다.
- **심사 중에는 production 채널에 보내지 않는다.** 제출 전에 `pnpm app-update:off`, 승인 뒤 `pnpm app-update:on`. 심사자가 받는 앱이 심사 대상과 달라진다. 고칠 것이 생기면 승인 뒤 업데이트로 보낸다.
  앱의 주된 목적이나 기능을 바꾸는 변경은 업데이트가 아니라 새 빌드로 심사받는다(App Store 가이드라인 2.5.2).
- **되돌리기.** 문제가 있는 업데이트는 `npx eas-cli update:republish`로 이전 업데이트를 다시 보내거나 `npx eas-cli update:rollback`으로 되돌린다.

## 제출 전 확인

- 서버가 심사 기간과 출시 후 늘 켜져 있는지(심사자가 아무 때나 연다).
- 자동 앱 업데이트를 껐는지: `app/`에서 `pnpm app-update:status`가 `false`인지(끄기는 `pnpm app-update:off`, 승인 뒤 `pnpm app-update:on`).
- 데이터 백업: 인스턴스가 매일 `mongodump`를 받아 21일까지 두고, 인스턴스 자동 스냅샷에도 7일 남는다(`docs/PROJECT.md` 인프라의 백업). 최근 백업 파일이 있는지 본다.
- iPhone 스크린샷 규격: 제출 시점의 App Store Connect 안내를 기준으로 확인한다.

## 참고

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.2, 4.8, 5.1.1)
- [Expo: EAS Build, Submit](https://docs.expo.dev/build/introduction/), [EAS Update](https://docs.expo.dev/eas-update/getting-started/), [런타임 버전](https://docs.expo.dev/eas-update/runtime-versions/)
- [Firebase: Apple 로그인](https://firebase.google.com/docs/auth/ios/apple), [JS 토큰 취소](https://firebase.google.com/docs/auth/web/apple#token_revocation)
- [Firebase iOS SDK 코드 취소 요청](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseAuth/Sources/Swift/Backend/RPC/RevokeTokenRequest.swift)
