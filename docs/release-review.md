# 출시 전 점검 (2026-10-10)

개인 프로젝트 기준으로 데이터 손실, 주요 기능과 App Store 제출에 영향을 주는 항목만 확인했다.

## 수정·검증한 것

- PR #30: 방 생성 저장 실패, 같은 사용자의 서로 다른 방 동시 참가, 재연결 메시지 누락·복구 실패와 재시도 수정.
  앱 검사와 7개 회귀 테스트, 서버 110개 테스트를 통과했고 main의 웹·서버 운영 배포가 성공했다.
- 방 없는 사용자의 계정 삭제: 이름 설정 전, 방 생성 전, 방을 나간 뒤에도 설정을 열어 계정 삭제·로그아웃할 수 있게 했다.
- iOS Apple 연결 해제: 인증 코드를 액세스 토큰용 API에 보내던 요청을 Firebase iOS SDK의 코드 취소 요청으로 고쳤다.
  취소 실패를 숨기지 않고 서버 데이터 삭제 전에 중단한다. 요청 형식과 실패 전파를 자동 테스트한다.
- 운영 health는 UP, 인증 없는 `/api/me`는 401. 웹 manifest·홈 화면 아이콘·알림 아이콘과 서비스 워커는 저장소 파일과 일치한다.

## App Store 제출 전 남은 필수 확인

- **개인정보처리방침과 연락처**: 현재 앱에 정책 화면·링크·문의 연락처가 없다. 인증 식별자·이름·채팅 내용·푸시 토큰,
  Firebase·MongoDB Atlas·Railway·Cloudflare·Expo/브라우저 푸시 이용, 보관·삭제 정책을 실제 동작에 맞게 공개하고
  App Store Connect 개인정보 항목도 채워야 한다. 2인 방에서는 탈퇴한 사람의 기존 대화가 상대에게 남는 동작도 명시해야 한다.
- **사용자 콘텐츠 대응**: 지금은 상대 신고·차단, 유해 콘텐츠 대응 기능이 없다. 초대로 연결하는 1:1 서비스여도 사용자
  메시지를 다루므로 심사 지침 1.2에 대한 준비가 필요하다. 방 나가기를 차단 기능이라고 단정하지 않는다.
  공개 랜덤 채팅이 아니라 초대 기반 개인 대화라는 점은 심사 설명에 적는다.
- **iPhone 개발용 빌드 실측**: Apple 로그인·연결·삭제, 앱을 닫은 상태의 푸시, 알림 탭 후 복귀, 백그라운드 복귀·재연결,
  키보드와 스크롤, 새 아이콘·스플래시는 실기기 확인 전이다. 웹·서버 배포 성공은 iOS 바이너리 검증을 뜻하지 않는다.
  Firebase Apple 제공업체의 Services ID·Team ID·Key ID·private key와 EAS APNs 설정도 실제 로그인·삭제·푸시로 확인한다.

## 당장 출시를 막는 버그로 보지 않은 것

Expo Doctor 21개 검사 중 20개를 통과했다. 나머지는 SDK 57의 expo, constants, linking, notifications, router 패치 버전이
최신 권장 버전보다 1~2개 뒤인 항목이다. 버전 호환 오류로 단정하지 않으며, 다음 네이티브 빌드를 준비할 때 패치 업데이트와
개발용 빌드 검증을 묶어서 한다. 출시 전 패키지를 무작정 올리거나 기능을 늘리지는 않는다.

## 근거

- [Apple App Review Guidelines 1.2, 5.1.1](https://developer.apple.com/app-store/review/guidelines/)
- [Firebase JS Apple 토큰 취소](https://firebase.google.com/docs/auth/web/apple#token_revocation)
- [Firebase iOS Apple 토큰 취소](https://firebase.google.com/docs/auth/ios/apple#token_revocation)
- [Firebase iOS SDK 코드 취소 요청](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseAuth/Sources/Swift/Backend/RPC/RevokeTokenRequest.swift)
