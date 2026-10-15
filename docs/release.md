# App Store 출시

iOS 앱을 App Store에 올리는 순서, 지금 상태, 제출 전에 확인할 것. 제품·서버는 `docs/spec.md`, 문의 운영은 `docs/support-operations.md`.

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
- Expo SDK 57 권장 패치 적용, `pnpm dlx expo-doctor` 21/21.
- EAS development·production 환경에 공개 클라이언트 설정 5개(`EXPO_PUBLIC_API_URL`, Firebase 4개), `eas.json`에서 환경을 고른다.
- Gmail 발송(OAuth 앱 Production, `gmail.send`)과 서버 환경변수 설정.

## 순서

1. **개발용 빌드.** 첫 빌드 전에 `app.json`·의존성을 확정해 빌드 횟수를 아낀다(무료 플랜은 월 제한).
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
     영구 차단은 없다(`docs/support-operations.md`의 "심사 설명에 쓸 사실"). Guideline 1.2를 모두 충족한다고 단정하지 않는다.
     심사자는 게스트로 바로 시작할 수 있다고 적는다.
5. **제출.** 운영자가 최종 확인하고 직접 제출한다.

## 제출 전 확인

- 서버 `.env`의 `BUDDYCHAT_BUDDY_EXPPERLEVEL`이 4인지(5로 적혀 있으면 4로 바꾸고 컨테이너를 다시 만든다. 서버가 켜질 때 모든 버디의 EXP를 4/5로 줄여 레벨을 지킨다)(값을 읽지 않아 운영자가 확인한다).
- 서버가 심사 기간과 출시 후 늘 켜져 있는지(심사자가 아무 때나 연다).
- 데이터 백업: Atlas M0는 자동 백업이 없다. 사용자가 생기기 전에 유료 클러스터나 정기 `mongodump`를 정한다(미뤄 둠).
- iPhone 스크린샷 규격: 제출 시점의 App Store Connect 안내를 기준으로 확인한다.

## 참고

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.2, 4.8, 5.1.1)
- [Expo: EAS Build, Submit](https://docs.expo.dev/build/introduction/)
- [Firebase: Apple 로그인](https://firebase.google.com/docs/auth/ios/apple), [JS 토큰 취소](https://firebase.google.com/docs/auth/web/apple#token_revocation)
- [Firebase iOS SDK 코드 취소 요청](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseAuth/Sources/Swift/Backend/RPC/RevokeTokenRequest.swift)
