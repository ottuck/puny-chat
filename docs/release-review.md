# 출시 전 점검 (2026-10-12)

개인 프로젝트 기준으로 데이터 손실, 주요 기능과 App Store 제출에 영향을 주는 항목만 확인했다.

## 수정·검증한 것

- PR #30: 방 생성 저장 실패, 같은 사용자의 서로 다른 방 동시 참가, 재연결 메시지 누락·복구 실패와 재시도 수정.
  앱 검사와 7개 회귀 테스트, 서버 110개 테스트를 통과했고 main의 웹·서버 운영 배포가 성공했다.
- 방 없는 사용자의 계정 삭제: 이름 설정 전, 방 생성 전, 방을 나간 뒤에도 설정을 열어 계정 삭제·로그아웃할 수 있게 했다.
- iOS Apple 연결 해제: 인증 코드를 액세스 토큰용 API에 보내던 요청을 Firebase iOS SDK의 코드 취소 요청으로 고쳤다.
  취소 실패를 숨기지 않고 서버 데이터 삭제 전에 중단한다. 요청 형식과 실패 전파를 자동 테스트한다.
- 계정 삭제는 현재·과거 방의 본인 텍스트와 본인 이름을 담은 SYSTEM 기록을 제거한다. Buddy 이벤트의 작성자 ID와
  함께 대화한 사용자 목록에서도 본인을 뺀다. 상대의 메시지·Buddy·앨범은 유지하고 일반 방 나가기와 구분한다.
  변경된 기록은 온라인 기기에 다시 읽도록 알리며, 오프라인 기기도 재연결에서 기록 버전을 비교한다.
- EAS CLI에서 `vison901` 계정 접근을 확인하고 development·production 환경 각각에 공개 클라이언트 설정 5개를 등록했다.
  `EXPO_PUBLIC_API_URL`은 `https://api.puny-chat.com`, Firebase 설정은 로컬 프로젝트 설정에서 읽어 등록했다.
  등록 후 내려받아 값 일치를 확인했으며 값 자체는 Git·문서에 기록하지 않았다. `eas.json`에 환경 선택을 명시했다.
  preview 환경변수는 이번 출시 준비 대상에 포함하지 않는다.
- 이번 변경 검증: 앱 검사·회귀 테스트 12개·웹 빌드, 서버 포맷 검사·전체 테스트 132개 통과.
  이전 기록 응답·늦은 돌봄 이벤트·과거 방·삭제 도중 중단 후 재시도도 검증했다. Apple 로그인·푸시·문의 메일 실동작은 나중에 확인한다.
  자동 리뷰가 지적한 다른 기기의 동시 방 나가기 후 이름 기록 재생성도 삭제 시작 표식과 저장 후 확인으로 막고 회귀 테스트했다.
  늦은 SYSTEM 기록을 제거할 때는 해당 방을 별도로 갱신해 잠깐 조회된 이름 기록도 기기 캐시에 남지 않도록 검증했다.
  늦은 Buddy 이벤트의 작성자 정리도 같은 갱신을 적용한다. 사용자 삭제 후 실패해 남은 임시 처리 기록은 주간 정리에서 제거하며,
  삭제 중인 사용자 표식은 유지하는 것을 검증했다.
- 연결 계정의 보관: 연결 전에 받은 게스트 토큰이 다른 기기에서 다시 사용되면 연결 계정을 게스트로 되돌리던 문제를
  회귀 테스트로 재현했다. `guest=true`는 처음 만들 때만 적고, 연결 후에는 다시 게스트로 바꾸지 않는다. 이전 토큰 요청
  뒤 40일이 지나도 연결 계정과 방이 정리되지 않는 것을 검증한다.
- 운영 health는 UP, 인증 없는 `/api/me`는 401. 웹 manifest·홈 화면 아이콘·알림 아이콘과 서비스 워커는 저장소 파일과 일치한다.
- 개인정보처리방침과 문의 연락처를 로그인 전·설정에서 공개했다. 정책은 한국어·일본어·영어로 제공하며 실제 수집·위탁·삭제 동작을 설명한다.
- 상대 신고·내보내기 시 기존 초대 전부 무효화, 양쪽 대화 삭제, 상대의 모든 기존 기기 연결 종료를 구현했다. 신고자의 Buddy·앨범은 유지한다.
  신고 사본은 최근 텍스트 최대 50개를 서버에서 90일 보관한다. 운영자 메일은 실패 시 재시도하고 사용자에게 자동 답장을 보내지 않는다.
  서버 테스트로 기존 코드 재입장, 남의 방 조작, 동시 종료, 중단 후 복구, 메일 재시도·선택 답장 주소를 확인했다.

## App Store 제출 전 남은 필수 확인

- **제출 정보**: App Store Connect에 `https://puny-chat.com/privacy`와 지원 URL `https://puny-chat.com/support`를 등록하고,
  실제 수집 정보에 맞는 개인정보 항목을 채운다. 운영자 표기와 정책 내용은 출시 대상·운영 정보에 맞게 최종 확인한다.
- **이메일 연결**: Railway Hobby는 SMTP를 차단한다. Gmail API 발송 권한을 직접 승인하고 Railway에 `GMAIL_CLIENT_ID`,
  `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`을 등록한 뒤 실제 알림 수신을 확인한다.
  미설정 상태에서도 접수·신고 조치는 저장되지만 이메일 알림은 대기한다. 절차는 `docs/support-operations.md`.
- **사용자 콘텐츠 대응**: 초대로 연결하는 1:1 서비스라는 점과 신고·대화 종료·기존 코드 무효화·수동 대응 흐름을 심사 설명에 적는다.
  이번 구현에는 콘텐츠 사전 필터나 서비스 전체 영구 차단이 없다. 심사 지침 1.2의 필터링·차단 요건을 모두 충족한다고
  단정하지 않으며 심사 피드백이 요구하는 범위를 확인한다.
- **iPhone 개발용 빌드 실측**: Apple 로그인·연결·삭제, 앱을 닫은 상태의 푸시, 알림 탭 후 복귀, 백그라운드 복귀·재연결,
  키보드와 스크롤, 새 아이콘·스플래시는 실기기 확인 전이다. 웹·서버 배포 성공은 iOS 바이너리 검증을 뜻하지 않는다.
  Firebase Apple 제공업체의 Services ID·Team ID·Key ID·private key와 EAS APNs 설정도 실제 로그인·삭제·푸시로 확인한다.

## 당장 출시를 막는 버그로 보지 않은 것

SDK 57의 expo, constants, linking, notifications, router를 같은 SDK의 권장 패치로 업데이트했다.
`pnpm dlx expo-doctor`는 21개 검사를 모두 통과했다. 다음 실기기 검증에는 이 의존성을 포함한 새 네이티브 빌드를 사용한다.

## 근거

- [Apple App Review Guidelines 1.2, 5.1.1](https://developer.apple.com/app-store/review/guidelines/)
- [Firebase JS Apple 토큰 취소](https://firebase.google.com/docs/auth/web/apple#token_revocation)
- [Firebase iOS Apple 토큰 취소](https://firebase.google.com/docs/auth/ios/apple#token_revocation)
- [Firebase iOS SDK 코드 취소 요청](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseAuth/Sources/Swift/Backend/RPC/RevokeTokenRequest.swift)
