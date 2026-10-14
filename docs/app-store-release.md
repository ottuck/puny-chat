# App Store 출시 진행 (2026-10-14)

iOS 앱을 App Store에 올리는 절차와 진행 상태. 제품 사양은 `docs/product.md`, 서버는 `docs/server-design.md`,
출시 전 코드 점검 결과는 `docs/release-review.md`에 있다. 이 문서는 **계정·콘솔 설정과 빌드·제출 순서**만 다룬다.

인증 키·private key·토큰·Team ID 같은 값은 이 문서와 Git에 적지 않는다. 값은 각 콘솔(Apple, Firebase, EAS, 서버 `.env`)에만 둔다.
아래 "완료"는 운영자가 콘솔에서 직접 확인한 것이고, 코드와 문서만으로는 검증할 수 없다.

## 진행 상태

| 단계 | 상태 |
| --- | --- |
| Apple Developer Program 가입·결제 | 완료 |
| App ID 등록 (`com.ottuck.buddychat`) | 완료 |
| App ID에서 Sign in with Apple 켜기 | 완료 |
| Sign in with Apple용 private key 만들기 | 완료 |
| Services ID 만들고 연결 | 완료 |
| Firebase Authentication의 Apple 제공업체 설정 | 완료 |
| App Store Connect에 puny-chat 앱 등록 | 완료 |
| EAS iOS 개발용 빌드 | 예정 (EAS의 iOS 빌드 기록 0건) |
| iPhone 실기기 검증 | 예정 |
| TestFlight 배포·확인 | 예정 |
| 스토어 정보 입력·심사 제출 | 예정 |

## 코드 쪽 준비 (완료)

- Sign in with Apple: `app.json`의 `ios.usesAppleSignIn`과 `expo-apple-authentication` 플러그인, 로그인·연결·삭제 코드
  (`app/src/features/auth/apple-sign-in.ios.ts`). 계정 삭제 때는 Apple 토큰도 취소한다.
- 푸시: `expo-notifications`, EAS projectId 연결.
- 아이콘·스플래시: `app/assets/README.md`.
- 수출 규정: `ITSAppUsesNonExemptEncryption: false`(HTTPS 같은 표준 암호화만 쓴다). 업로드마다 묻지 않게 하려는 설정이다.
- Expo SDK 57 권장 패치를 맞췄고 `pnpm dlx expo-doctor`가 21개 검사를 모두 통과한다.
- EAS 환경(development·production)에 공개 클라이언트 설정 5개가 있고 `eas.json`에서 환경을 고른다.

## 앞으로 할 일 (순서대로)

1. **개발용 빌드** (Apple 인증과 기기 등록은 운영자가 한다. 첫 빌드 전에 `app.json`·의존성을 확정해 빌드 횟수를 아낀다)
   - 기기 등록: `npx eas-cli device:create`
   - 빌드: `npx eas-cli build --profile development --platform ios`, 완료되면 링크로 설치. 개발자 모드를 켠다.
2. **실기기 검증** (결과에 따른 코드 수정은 같이 한다)
   - Apple 로그인·계정 연결·계정 삭제(Firebase Apple 제공업체의 Services ID·Team ID·Key ID·키 연결 확인 포함)
   - 앱을 닫은 상태의 푸시, 알림을 눌러 돌아오기(EAS APNs 키 설정)
   - 백그라운드 복귀·재연결, 키보드·스크롤, 새 아이콘·스플래시, 문의 접수 후 운영자 메일 수신
3. **TestFlight**: `npx eas-cli build --profile production --platform ios`로 빌드하고 `eas submit`으로 올려 TestFlight에서 확인한다.
4. **App Store Connect 정보 입력**
   - 개인정보처리방침 `https://puny-chat.com/privacy`, 지원 URL `https://puny-chat.com/support`
   - 개인정보 수집 항목(처리방침의 실제 수집 내용과 맞춘다), 연령 등급, 스크린샷, 설명, 키워드, 심사 정보
   - 심사 메모: 초대 코드로 연결되는 최대 2인 텍스트 채팅이고, 신고·대화 종료·기존 초대 무효화 흐름이 있으며,
     콘텐츠 사전 필터와 서비스 전체 영구 차단은 없다(`docs/support-operations.md`의 "심사 설명에 쓸 사실"). 심사 지침 1.2를
     모두 충족한다고 단정하지 않는다. 심사자가 쓸 수 있도록 게스트로 바로 시작할 수 있다는 점도 적는다.
5. **제출**: 운영자가 최종 확인하고 직접 제출한다.

## 나중에 확인할 것

- **iPhone 스크린샷 규격**: 앞으로 요구되는 스크린샷 규격이 바뀐다는 이야기(2027년 4월부터, Duo 관련)가 있었다. 공식 안내로
  확인한 뒤 해당되면 반영한다. 제출 시점의 App Store Connect 안내가 기준이다.
- **데이터 백업**: Atlas M0에는 자동 백업이 없다. 사용자가 생기기 전에 유료 클러스터로 올리거나 정기 `mongodump`를 둔다
  (운영자 결정으로 미뤄 둠).
- **안정적인 서버**: 심사 기간과 출시 후 서버가 항상 켜져 있어야 한다(심사자가 아무 때나 앱을 연다). 로컬 서버로 옮기면
  가용성이 문제가 된다.

## 참고

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Expo: EAS Build, Submit](https://docs.expo.dev/build/introduction/)
- [Firebase: Apple 로그인](https://firebase.google.com/docs/auth/ios/apple)
