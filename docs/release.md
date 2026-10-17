# App Store 출시

iOS 앱을 App Store에 올리는 순서, 지금 상태, 제출 전에 확인할 것. 제품·서버·운영은 `docs/PROJECT.md`.

인증 키·private key·토큰·Team ID 같은 값은 이 문서와 Git에 적지 않는다. 값은 각 콘솔(Apple, Firebase, EAS, 서버 `.env`)에만 둔다.
콘솔 쪽 "완료"는 운영자가 직접 확인한 것이고 코드로는 검증할 수 없다.

## 진행 상태

| 단계 | 담당 | 상태 |
| --- | --- | --- |
| Apple Developer Program 가입, App ID(`com.ottuck.buddychat`), Sign in with Apple 켜기 | 운영자 | 완료 |
| Sign in with Apple 키, Services ID, Firebase Apple 제공업체 | 운영자 | 완료 |
| App Store Connect 앱 등록 | 운영자 | 완료 |
| 코드 쪽 준비(아래) | 코드 | 완료 |
| EAS iOS 개발용 빌드·설치 | 운영자(Apple 인증, 기기 등록) | 예정 |
| iPhone 실기기 검증 | 운영자 조작, 결과에 따른 코드 수정 | 예정 |
| production 빌드·TestFlight | 운영자 인증, CLI는 지원 | 예정 |
| 스토어 정보 입력·심사 제출 | 문안은 지원, 최종 확인·제출은 운영자 | 예정 |

## 코드 쪽 준비 (완료)

- Sign in with Apple: `app.json`의 `ios.usesAppleSignIn`, `expo-apple-authentication` 플러그인, 로그인·연결·삭제(`features/auth/apple-sign-in.ios.ts`).
  계정 삭제 때 Apple 토큰을 취소한다.
- 앱 안 계정 삭제(Guideline 5.1.1(v)), 개인정보처리방침·지원 페이지(로그인 없이, 세 언어), 문의·상대 신고·내보내기.
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
   - 앱을 닫은 상태의 푸시, 알림을 눌러 돌아오기(EAS APNs 키)
   - 백그라운드 복귀·재연결, 키보드·스크롤, 아이콘·스플래시, 설정의 선택창
   - 문의 접수 후 운영자 수신함에 알림이 실제로 오는지
3. **TestFlight.** production 빌드 후 `eas submit`으로 올려 확인한다.
   ```bash
   npx eas-cli build --profile production --platform ios
   ```
4. **App Store Connect 정보.**
   - 개인정보처리방침 `https://puny-chat.com/privacy`, 지원 URL `https://puny-chat.com/support`
   - 개인정보 수집 항목(처리방침의 실제 수집 내용과 맞춘다), 연령 등급, 스크린샷, 설명, 키워드
   - 심사 메모: 초대 코드로 연결되는 최대 2인 텍스트 채팅이고, 신고·대화 종료·기존 초대 무효화가 있으며 콘텐츠 사전 필터와 서비스 전체
     영구 차단은 없다(`docs/PROJECT.md` 운영의 "심사 설명에 쓸 사실"). Guideline 1.2를 모두 충족한다고 단정하지 않는다.
     심사자는 게스트로 바로 시작할 수 있다고 적는다.
5. **제출.** 운영자가 최종 확인하고 직접 제출한다.

## 앱 업데이트 (EAS Update)

`expo-updates`가 들어간 빌드부터 JS·그림·번역 변경을 심사 없이 보낸다. 앱은 켤 때 업데이트를 받아 두고 다음 실행에 적용한다.
서버 변경은 지금처럼 배포만 하면 모든 앱에 바로 적용된다(옛 앱도 계속 부르므로 API는 호환을 지킨다). 웹은 상관없다.

- **채널.** `eas.json`의 preview·production 빌드가 같은 이름의 채널을 본다. 개발용 빌드는 Metro로 바로 받는다.
- **runtimeVersion은 `appVersion` 정책.** 업데이트는 `app.json`의 `version`(지금 1.0.0)이 같은 빌드에만 간다. 네이티브가 바뀌면(패키지 추가·업그레이드,
  config plugin, `app.json`의 네이티브 설정) `version`을 올리고 새로 빌드해 심사받는다. 올리지 않으면 옛 빌드에 맞지 않는 업데이트가 가서 앱이 깨질 수 있다.
- **보내기.** main CI·웹 배포를 확인한 뒤, 같은 커밋의 `app/` 폴더에서(저장소 최상위에서는 "Run this command inside a project directory"로 실패한다):
  ```bash
  npx eas-cli update --channel production --environment production --message "방 소품 탭 반응"
  ```
  `--environment`로 EAS의 production 환경변수(`EXPO_PUBLIC_*`)를 쓴다.
- **심사 중에는 production 채널에 보내지 않는다.** 심사자가 받는 앱이 심사 대상과 달라진다. 고칠 것이 생기면 승인 뒤 업데이트로 보낸다.
  앱의 주된 목적이나 기능을 바꾸는 변경은 업데이트가 아니라 새 빌드로 심사받는다(App Store 가이드라인 2.5.2).
- **되돌리기.** 문제가 있는 업데이트는 `npx eas-cli update:republish`로 이전 업데이트를 다시 보내거나 `npx eas-cli update:rollback`으로 되돌린다.

## 제출 전 확인

- 서버 `.env`의 `BUDDYCHAT_BUDDY_EXPPERLEVEL`이 5인지(값을 읽지 않아 운영자가 확인한다).
- 서버가 심사 기간과 출시 후 늘 켜져 있는지(심사자가 아무 때나 연다).
- 데이터 백업: Atlas M0는 자동 백업이 없다. 사용자가 생기기 전에 유료 클러스터나 정기 `mongodump`를 정한다(미뤄 둠).
- iPhone 스크린샷 규격: 제출 시점의 App Store Connect 안내를 기준으로 확인한다.

## 참고

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.2, 4.8, 5.1.1)
- [Expo: EAS Build, Submit](https://docs.expo.dev/build/introduction/), [EAS Update](https://docs.expo.dev/eas-update/getting-started/), [런타임 버전](https://docs.expo.dev/eas-update/runtime-versions/)
- [Firebase: Apple 로그인](https://firebase.google.com/docs/auth/ios/apple), [JS 토큰 취소](https://firebase.google.com/docs/auth/web/apple#token_revocation)
- [Firebase iOS SDK 코드 취소 요청](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseAuth/Sources/Swift/Backend/RPC/RevokeTokenRequest.swift)
