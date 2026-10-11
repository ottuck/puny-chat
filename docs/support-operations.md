# 문의·신고 운영

현재 발송 계정과 수신 주소는 모두 `vison901@gmail.com`이다. 이용자는 앱에서 접수 완료·접수 번호를 보고,
운영자에게만 접수 알림을 보낸다. 답장 주소를 입력한 경우 메일의 Reply-To에 넣어 운영자가 직접 답장할 수 있다.
답장 여부와 내용은 운영자가 결정한다. 사용자 자동 회신과 관리자 페이지는 없다.

## Gmail 연결

현재 Railway Hobby는 SMTP 발송을 차단하므로 Gmail API(HTTPS)를 사용한다. Gmail 앱 비밀번호로는 연결되지 않는다.
운영자 한 계정의 발송 권한만 사용하며 앱 이용자의 Google 로그인에는 Gmail 권한을 추가하지 않는다.

1. Google Cloud 프로젝트에서 Gmail API를 활성화한다. 운영자 발송용 OAuth 웹 클라이언트를 별도로 만들고
   승인된 리디렉션 URI로 `https://developers.google.com/oauthplayground`를 등록한다.
2. [Google OAuth Playground](https://developers.google.com/oauthplayground/)의 설정에서 **Use your own OAuth credentials**를 켜고
   해당 클라이언트 ID·secret을 직접 입력한다. Google 기본 Playground 클라이언트로 발급한 토큰은 24시간 후 취소되므로 사용하지 않는다.
3. 권한은 `https://www.googleapis.com/auth/gmail.send`만 선택한다. 발송 계정 `vison901@gmail.com`으로 직접 승인하고
   authorization code를 교환해 refresh token을 발급받는다. 메일 읽기·삭제 권한은 요구하지 않는다.
   OAuth 앱이 External / Testing 상태면 refresh token이 7일 뒤 만료될 수 있다. 장기 운영 전 Google의 운영 상태·검증 요구를 확인한다.
4. Railway 프로젝트 → production → server → Variables에 아래 세 인증 값을 직접 등록하고 적용·재배포한다.
   비밀 값을 채팅, Git, PR이나 문서에 적지 않는다. 서버가 시작할 때 읽는 환경변수다.
5. 앱에서 일반 문의 한 건을 접수하고 운영자 Gmail에서 접수 번호와 수신을 확인한다. 문의자의 답장 주소에는 자동 메일이 가지 않는다.

| 변수 | 기본값 / 용도 |
| --- | --- |
| `GMAIL_CLIENT_ID` | 운영자 발송용 OAuth 클라이언트 ID |
| `GMAIL_CLIENT_SECRET` | 해당 클라이언트의 secret |
| `GMAIL_REFRESH_TOKEN` | 발송 계정으로 승인한 refresh token |
| `SUPPORT_FROM` | `vison901@gmail.com`, 승인한 Gmail 발송 계정과 일치해야 함 |
| `SUPPORT_EMAIL` | `vison901@gmail.com`, 알림 수신 주소 |

인증 값이 비어 있으면 서버 접수와 신고 조치는 동작하고 메일은 대기한다. 등록 후 남아 있는 접수 알림을 발송한다.
실패한 메일은 서버가 2~60분 간격으로 재시도한다. 계정 비밀번호 변경·권한 취소·토큰 만료로 승인이 해제되면 다시 연결한다.
DB 기록 전 서버 중단 등으로 같은 알림이 중복될 수 있으므로 접수 번호로 확인한다.

서비스 메일로 바꾸면 위 수신·발송 변수와 앱의 `SUPPORT_EMAIL`, 세 언어 개인정보처리방침 연락처를 함께 변경·배포한다.
Terraform이 Gmail 변수를 관리하지 않으므로 이후 인프라 변경 시 Railway에 직접 등록한 변수가 유지되는지도 확인한다.

## 접수 후 직접 대응

- Gmail에서 내용·신고 사유·관련 사용자·접수 번호를 확인한다. 신고 알림에는 삭제 전 최근 텍스트 최대 50개가 포함된다.
- 신고 완료 시 서버가 상대를 퇴장시키고 기존 코드와 두 사람의 대화를 삭제한다. 신고자는 Buddy·앨범을 갖고 새 solo 방에서 계속 이용한다.
  일반 내보내기는 신고 사본과 이메일 알림을 만들지 않는다. 계정 이용 제한은 자동 조치에 포함하지 않는다.
- 추가 설명이나 답변이 필요하면 입력한 Reply-To로 직접 답장한다. 주소를 입력하지 않았다면 이메일 답장이 불가능하다.
- 메일이 오지 않으면 기존 MongoDB Atlas 콘솔의 `supportTickets`에서 `_id`(앱 접수 번호)로 확인한다.
  `emailStatus=PENDING`, `emailAttempts`, `nextEmailAttemptAt`으로 발송 대기 여부를 본다. 본문을 로그나 공개 이슈에 옮기지 않는다.
  서버가 정상이라면 미완료 종료 작업도 자동 재시도한다. 전용 관리 API나 별도 운영 명령 도구는 필요하지 않다.
- 접수 기록·신고 사본은 접수 후 90일에 DB 자동 삭제 대상으로 정리된다. Gmail의 받은 편지·보낸 편지 등 메일 사본은
  서버 TTL로 지워지지 않으므로 대응 후 불필요해지면 운영자가 삭제한다. 개인정보 관련 요청은 본인 확인 후 필요한 범위에서 처리한다.

## 심사 설명에 쓸 사실

초대 코드로 연결되는 최대 2인 텍스트 채팅이며, 채팅 헤더와 설정에서 상대 신고를 할 수 있다. 신고 완료와 동시에
해당 대화를 종료하고 상대의 기존 접근·초대와 전체 대화 기록을 제거한다. 운영자는 신고 자료를 이메일로 확인하고 필요한 답변을 수동으로 한다.
개인정보처리방침과 연락처는 로그인 없이 공개한다. 별도 관리자 페이지는 없으며 콘텐츠 사전 필터와 영구 이용 제한도 구현하지 않았다.
현재 구현이 심사 지침 1.2의 모든 요건을 충족한다고 약속하지 않는다.

근거: [Railway 외부 통신 제한](https://docs.railway.com/networking/outbound-networking),
[Gmail API 발송](https://developers.google.com/workspace/gmail/api/guides/sending),
[Google OAuth 토큰 정책](https://developers.google.com/identity/protocols/oauth2),
[Apple 심사 지침](https://developer.apple.com/app-store/review/guidelines/).
