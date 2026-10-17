# puny-chat

무엇을 만들고 무엇을 만들지 않는지, 서버가 어떻게 동작하는지, 어떻게 운영하는지. 기능·범위·서버를 바꾸기 전에 읽고, 결정이 바뀌면 코드와 같은 커밋에서 고친다.
지금 상태만 적는다(지난 경위는 Git 기록에 있다). Buddy의 볼거리와 그림 작업은 `docs/fun-improvements.md`, App Store 출시는 `docs/release.md`.

**차례**: 제품 · Buddy · 서버 · 포트폴리오로서 · 운영(문의·신고)

> **혼자 또는 친구 한 명과 작은 Buddy를 키우면서 쓰는 초경량 1:1 실시간 채팅 앱.**
> Chat with someone you like, and raise a tiny buddy together. — **Chat first. Buddy makes it fun.**

- 서비스 이름은 **puny-chat**(소문자, `puny-chat.com`), GitHub 저장소도 puny-chat. 코드 패키지·로컬 폴더 이름은 buddy-chat.
- Pokémon·Tamagotchi를 떠올리게 하는 이름(PokeChat, Tama-, -gotchi 등)은 쓰지 않는다.

# 제품

## 원칙

- **채팅은 핵심 기능, Buddy는 정체성.** 매일 쓰는 건 1:1 실시간 채팅이고, 다른 메신저와 다르게 만드는 건 둘이 함께 키우는 Buddy다.
  Buddy는 채팅 화면 위쪽 **무대**에서 살아 움직인다. Buddy 때문에 채팅 사용성을 희생하지 않는다.
- **레트로 Buddy, 현대적인 채팅.** 무대는 도트·제한된 색·작은 움직임, 채팅(메시지, 입력, 초대, 설정)은 익숙한 메신저처럼.
- **게임으로 만들지 않는다.** 퀘스트, 데일리 미션, 재화, 상점, 가챠, 장비, 전투, 미니게임, 랭킹, 친구 경쟁은 없다.
- **스트레스 없는 돌봄.** Buddy는 죽지 않는다. 방치하면 배고프고 더러워질 뿐이고, 돌보면 쉽게 돌아온다. 앱을 열라고 요구하지 않는다.
- **오리지널.** Pokémon·Tamagotchi·Digimon의 이름, 이미지, 캐릭터를 쓰지 않는다. 가져오는 건 배고픔·밥·똥·청소·성장·진화 같은
  virtual pet 아이디어와 도트라는 표현 방식뿐이다.
  - 피한다: 달걀형·원형 기기 테두리, 기기 버튼 3개, 흑백 LCD 위아래의 아이콘 줄, 특정 캐릭터를 떠올리게 하는 실루엣.
  - 써도 된다: 도트, 제한된 색, 작은 장난감 느낌, 알에서 시작하는 성장, 굵은 외곽선의 귀여운 캐릭터.
- **AI 기능은 넣지 않는다.** AI 채팅, 대화 요약, 데일리 질문 등. Buddy의 말은 정해진 문구와 확률로만 고른다.
- **작게 출시한다.** 실제로 출시할 수 있는 작은 제품. 미래 기능을 위해 미리 추상화하지 않는다.
- 디자인 톤: Cute, Simple, Retro, Friendly.

## 핵심 경험

두 사람이 대화하면서 하나의 Buddy를 같이 키운다. Buddy 이벤트는 채팅 타임라인에 들어가고, 그 사이에서 대화가 생긴다.

```text
18:02  버디가 💩을 쌌어요
Henry: ㅋㅋ 또 쌌네
Yuki:  니가 치워
```

- **Solo → Duo.** 혼자 시작할 수 있고(room 멤버 1명), 친구를 초대하면 2명이 되며 Buddy는 그대로 이어진다. room은 최대 2명.
- **한 화면.** 헤더에 상대(접속·입력 중)와 도움말·설정, 그 아래 화면 높이의 약 1/3이 Buddy 무대, 나머지가 대화. 하단 탭은 없다.
  무대는 입력 중에도, 위로 스크롤해도 접히지 않는다(접었다 펴면 손가락 아래에서 대화가 움직여 스크롤이 튄다).
- 첫 흐름: 바로 시작하기(게스트) → 이름 → Buddy 이름 짓기(알 탄생) → 혼자 채팅 화면 → 언제든 초대 링크·코드로 친구 초대.
- **푸시는 상대 메시지용이다.** Buddy 상태로 알림을 보내지 않는다("배고파요!" 등).

## 구경하기

처음 온 사람(특히 포트폴리오로 보러 온 사람)은 혼자라 알 하나만 보인다. 첫 화면의 "먼저 구경하기"(`/demo`)는 로그인 없이
채팅 화면 그대로 대본이 재생되는 방이다(약 55초): 둘이 인사하면 함께 보너스로 알이 깨어나 춤추고, 밥을 먹고, 💩을 싸고 친구가
치우고, 꼬마·어른으로 자란다. 방문자도 밥그릇·💩을 누르거나 메시지를 보낼 수 있다(상대가 정해진 문구로 짧게 답한다).
끝나면 어른 옆에 새 알이 놓이고 "바로 시작하기"로 이어진다. 앱 안에서만 돌고 계정·서버·저장이 없다.

## 게스트 우선

- 로그인이 대화를 막지 않는다. "바로 시작하기"(Firebase 익명 로그인)로 이름만 정하고 시작하며, 게스트도 모든 기능을 쓴다.
- 게스트는 **30일**. Firebase의 익명 계정 자동 정리(30일)를 그대로 제품 정책으로 쓴다. 기기를 바꾸거나 브라우저 데이터를 지우면
  게스트 계정은 되찾을 수 없다.
- 계정을 연결하면(웹 Google, 아이폰 Apple) uid가 그대로라 Buddy·방·대화가 이어진다. 이미 다른 사용자인 계정이면 합치지 않고 확인 후 전환한다.
- 첫 화면에서 30일을 알리고, 설정에 남은 일수와 계정 연결 버튼. 마지막 7일은 채팅 위에 조용한 안내 줄(3일부터 강조색), 누르면 설정.
  팝업으로 막지 않는다. 문구는 "회원가입"이 아니라 "계정 연결".
- 만료된 게스트의 서버 데이터는 서버가 주 1회 지운다(아래 게스트 정리).

## 플랫폼

- **iOS가 기준이다.** Safe Area, 키보드, 스크롤, 백그라운드 복귀, 재연결, 중복 없는 전송, 읽음, 입력 중, 푸시 같은 작은 UX 품질이 중요하다.
- **Web은 보조.** 같은 모바일 레이아웃을 가운데 두고 최대 폭만 제한한다. 넓은 창(768px~)에서는 한 톤 어두운 배경 위의 폰 크기 틀로 보인다.
  링크를 공유하면 일본어 미리보기(제목, 설명, 온천 장면 이미지, `app/+html.tsx`)가 뜬다(일본 출시).
- Android는 나중에 같은 코드로.
- UI는 ja / ko / en. 기기 언어를 따르고, 지원하지 않으면 영어. 주 대상은 일본 사용자.

## 설정

- 프로필(이름), 알림(기기별 스위치, 웹은 여기서 브라우저 권한을 묻는다), 방 정보(생성일·버디 이름·함께하는 사람. 방 이름은 따로 없다),
  계정 연결, 언어(기기 설정/한국어/日本語/English)와 화면 모드(기기 설정/라이트/다크), 도움말, 문의·개인정보처리방침, 로그아웃, 계정 삭제(맨 아래).
- 언어·화면 모드는 현재 값을 보여주는 행이고, 누르면 체크 표시가 있는 선택창(모바일 하단 시트, 넓은 웹 가운데 대화상자)을 연다. 이 기기에만 저장한다.
- 이름을 정하기 전, 방을 만들기 전, 방을 나간 뒤에도 설정을 열 수 있다(계정 삭제·로그아웃에 방이 필요 없다).
- 계정 삭제는 본인 메시지와 본인 이름이 든 시스템 기록을 지우고, 상대의 메시지·방·Buddy·앨범은 남긴다. 일반 방 나가기는 대화를 남긴다.

## 문의와 상대 신고

- 설정과 로그인 화면에서 문의·개인정보처리방침을 연다. 정책과 연락처(`support@puny-chat.com`)는 로그인 없이 공개하고 세 언어로 제공한다.
- 로그인한 사람은 문의 작성 화면을 쓴다. 상대가 있는 방에서만 "상대 신고"를 고를 수 있다. 답장 이메일 입력란은 없고, 접수 완료와
  접수 번호(화면에는 줄여서, 전체 UUID 복사 가능)를 앱에서 보여준다. 운영자에게만 메일 알림이 가고 사용자에게 개별 답장은 없다.
- 채팅 헤더의 상대 이름을 누르면 신고·내보내기 시트가 열린다. 확인 후 상대를 퇴장시키고 **두 사람의 기존 대화 전체를 지우고** 기존 초대를
  모두 무효화한다. 실행한 사람에게 Buddy와 앨범이 남는다. 새 초대로 다시 연결할 수 있고, 서비스 전체 이용 제한이나 영구 차단 목록은 없다.
- 신고만 삭제 전 최근 텍스트 최대 50개를 운영자 검토용으로 90일 보관한다. 전용 관리자 페이지나 콘텐츠 사전 필터는 없다(운영은 Gmail과 DB 콘솔, 아래 운영).

## MVP 범위

| 영역 | 포함 | 상태 |
| --- | --- | --- |
| 인증 | 게스트 시작, 이름, 계정 연결(웹 Google, 아이폰 Apple), 로그아웃, 계정 삭제 | 됨. 아이폰 Apple은 실기기 확인 전, 아이폰 Google은 나중 |
| Room | 만들기, solo, 초대 코드·링크, 참가, 최대 2명, 나가기 | 됨 |
| Chat | 실시간 텍스트, 히스토리, 재연결, 중복 방지, 읽음, 입력 중, 접속 표시 | 됨 |
| 푸시 | 상대 메시지 알림 | 웹 푸시 됨. 아이폰 앱 푸시는 실기기 확인 전 |
| Buddy | 이름, 배고픔, 청결, 밥·청소, 경험치, 레벨, 진화, 독립과 앨범, 직업 | 됨 |
| 고객 지원 | 개인정보처리방침·연락처, 문의, 상대 신고·내보내기 | 됨 |

넣지 않는 것: 그룹 채팅, 여러 room·여러 상대, 음성·영상 통화, 사진·파일 첨부, 스레드, 리액션, 스티커, 공개 프로필·피드·커뮤니티,
캘린더·공유 앨범·기념일, AI 기능, Buddy 여러 종류·분기 진화·교배, 게임 요소 전부.

나중에 고려할 수 있는 것: Buddy 종류 추가, room 테마(레트로 채팅), 스티커, 리액션, 사진 메시지, Android 출시, 유료화,
출시 후 사용량에 따른 Buddy 수치 조정.

## 성공 기준

채팅이 빠르다 · 끊겨도 복구된다 · 알림이 온다 · 메시지가 중복되지 않는다 · UI가 자연스럽다 · Buddy가 귀엽다 ·
Buddy 때문에 가끔 웃긴 상황이 생긴다.

# Buddy

Buddy 상태(레벨, 배고픔, 💩, 돌볼 수 있는지)는 서버가 계산한 `BuddyView`를 앱이 그대로 보여준다. 잠, 쓰다듬기, 춤·노래, 말풍선,
무대 꾸미기처럼 서버에 없는 모습은 앱이 정한다. 수치는 아래 서버의 Buddy 규칙.

## 캐릭터와 그림

- **말랑이.** 동그란 떡 같은 몸에 머리의 식물이 자란다. 한 종류, 4단계: 알(16×16) → 아기(16×16, 작은 새싹) → 꼬마(20×20, 잎 두 장과 팔)
  → 어른(22×24, 조금 더 크고 둥글게, 새싹 위에 벚꽃). 머리 위 식물로 단계를 알아본다.
- 동작은 단계마다 그린 기본 모습 하나에 눈·입·발만 바꿔 만든다. 모든 동작이 같은 얼굴이다.
- 도트는 문자열 격자 → SVG 사각형(`app/src/features/buddy/pixel`). 비트맵이 없어 iOS·웹 모두 선명하다. 작은 격자, 적은 색, 굵은 외곽선,
  머리가 큰 비율, 방향을 바꿀 때 좌우 반전, 프레임을 뚝뚝 넘기는 움직임. 그림 작업 규칙은 `docs/fun-improvements.md`.

## Buddy 무대

- **평소.** 무작위 위치로 좌우 이동한 뒤 1.5~5초 쉰다. 깜빡인다. 혼자 두면 20~40초마다 춤·노래나 가끔 생기는 사건을 한다.
- **잠.** 밤 23~7시(현지 시간, 라디오 DJ는 3~11시)에는 잔다. 상대 메시지가 오면 잠깐 깬다.
- **쓰다듬기.** 버디를 누르면 기뻐하거나(0.9초) 춤추거나 노래한다. 반응 중의 추가 클릭은 무시하고 쌓지 않는다. 채팅의 "춤"·"노래"와 구경하기
  대본은 클릭 잠금과 별개로 동작을 새로 시작한다. 예약된 자동 춤·노래는 진행 중인 반응을 덮어쓰지 않는다.
- 웹에서 마우스·터치로 누를 때는 테두리를 그리지 않고, 키보드로 선택할 때만 포커스를 표시한다.
- **말하기.** 꼬마부터 머리 옆 말풍선으로 짧게 말한다(3초, 대화에는 남기지 않음): 3일 넘게 안 열었으면 "오랜만이야!", 그날 처음 열면
  시간대 인사, 밥·쓰다듬기에 "고마워!", 청소에 "개운해!", 배고프면 "배고파…", 배부를 때 밥을 주면 "배불러", 가끔 질문.
  마지막으로 연 시각은 기기에만 저장한다. 진화하는 동안은 말풍선을 띄우지 않는다.
- **방에서 일어난 일에 반응한다.** 실시간으로 받은 메시지로 시작하고, 앱을 다시 열거나 재연결해서 채운 메시지에는 반응하지 않는다.
  누가 했든 두 사람 화면에서 같이 보인다.
  - 밥: 냠냠 먹고 하트. 💩: 힘주는 얼굴(> <)로 떨고 바닥에 💩. 청소: 반짝이며 기뻐한다.
  - 상대 메시지: 폴짝 뛰며 머리 위에 "!".
  - 레벨 업: 머리 위에 "LV▲", 폴짝, 레벨 숫자 강조. 최고 레벨(60)에는 방이 반짝이고 하늘에서 빛기둥이 내려오며 안내 셋이 차례로 뜬다.
  - 대화의 레벨 업 줄은 그 레벨에 소품이 오면 이름을 붙인다("Lv.9 ⬆️ 🎁 창문"). 20레벨이 넘으면 하루에 여러 번 올라도 그날의 가장 최근 줄만 보인다
    (`timeline.ts`의 `foldLevelUps`, 메시지는 서버에 그대로 있고 무대는 매번 축하한다).
  - 진화: 금빛 고리가 퍼지는 동안 이전·새 모습이 번갈아 보이고(1.4초), 번쩍인 뒤 반짝이가 터지며 새 모습. 앱을 닫아둔 사이에 진화했으면
    내 읽음 위치보다 새로울 때 다시 열 때 한 번 보여준다.
- **방 소품을 누르면** 저마다 움직이고, 화분·시계·창문·어항·좌탁·인형에는 버디가 한마디 한다(창문은 손님을 부르고, 장난감 상자·라디오는 춤, 오르골은 노래). EXP는 없다. 표는 `docs/fun-improvements.md`의 방 소품.
- **온천과 꿈.** 무대 오른쪽 위 ♨ 버튼으로 온천에 가서 쉰다(이 기기에서만, 집 버튼이나 10분 뒤 돌아옴). 방에서 12시간 만이면 +3 EXP. 처음 알을 보기 전에 이 기기에서 한 번,
  다 자란 모습의 짧은 꿈(약 5초)을 보여준다. 장면은 검은 원으로 바뀐다.
- **방의 빛.** 같은 방이 기기 시각에 따라 아침(살짝 푸르게)·낮·노을(창빛의 대비)·밤(무드등 둘레만 밝게)으로 칠해진다.
- 대화 내용·함께 있을 때·직업·사건(러그에 앉기 포함)·기간 한정 모습·온천·방의 빛·우편함·꿈은 `docs/fun-improvements.md`.

## 돌보기

- **식사.** 배고프면 알부터 머리 위에 밥 생각 풍선을 띄우고, 버디를 누르면 밥을 준다. 아기는 오른쪽 화분 옆 밥그릇에서 먹는다(평소 밥이
  있고, 배고플 때만 비어서 들썩이며 "!", 배부를 때 누르면 고개를 젓는다). 손이 생긴 꼬마·어른은 밥그릇이 없고, 먹을 때만 낮은 둥근 밥상이
  나와 그 뒤에서 먹는다. 밥공기 색은 밥그릇 보상(파랑 → 은 → 금)을 따른다.
- **💩.** 누를 때마다 하나씩 사라진다(반짝이며 날아감). 마지막 하나를 치우면 대화에 한 줄. 버디 앞에 그려서 발밑에 있어도 누를 수 있다.
- **어른은 💩 대신 일.** 어른은 💩을 싸지 않는다. 직업 장치를 누르거나 채팅에 "일"을 보내면 장치로 가서 일하고, 1시간이 지났으면 +2 EXP와
  대화 한 줄이 남는다. 남은 시간은 보여주지 않는다.
- **채팅으로 돌보기.** 메시지 전체가 "밥"·"청소"·"똥"·"일"이면 그 돌봄을 한다(규칙은 서버의 Buddy 규칙). "춤"·"노래"면 춤추고 노래한다.
  할 게 없으면 "배불러", "이미 깨끗해!"로 답한다.
- 이름·레벨을 누르면 Buddy 상세(경험치, 배부름, 청결, 직업, 다음 보상, 함께 보너스).

## 성장

- 경험치(레벨)로만 진화한다: 알 → 아기(Lv.3) → 꼬마(Lv.5) → 어른(Lv.10), 직업은 Lv.12, 독립은 Lv.20부터 고를 수 있고, 최고 Lv.60. 레벨당 **5 EXP**. 공식은 사용자에게 보여주지 않고
  "대화하고 돌봐줄수록 Buddy가 성장해요" 정도로만 말한다.
- 메시지 하루 10개(혼자) 또는 방 전체 20~30개와 함께 보너스(둘이)를 가정한 대략의 기간. 밥·청소를 더하면 더 빠르다.

  | 단계 | 누적 EXP | 혼자 | 둘이 함께 |
  | --- | --- | --- | --- |
  | 아기 (Lv.3) | 10 | 첫날 | 첫날 |
  | 꼬마 (Lv.5) | 20 | 약 2일 | 첫날 |
  | 어른 (Lv.10) | 45 | 약 5일 | 약 2일 |
  | 직업 (Lv.12) | 55 | 약 6일 | 약 2일 |
  | 독립 가능 (Lv.20) | 95 | 약 10일 | 약 4일 |
  | 최고 (Lv.60) | 295 | 약 31일 | 약 12일 |

  어른이 일찍 되는 것이 목적이다. 직업, 직업 장치, 일하기 같은 어른의 볼거리를 첫 주 안에 모두 겪게 한다.

- **둘이 함께.** 같은 날 두 사람이 모두 메시지를 보내면 하루 한 번 +10 EXP. 대화에 "🤝 오늘은 둘 다 왔어요!" 카드, 무대에서 하트와 두 번 크게 뛰기,
  그날은 레벨 옆에 🤝. Buddy 상세에 "나 ✅ · 상대 ⏳"와 남은 일. 상대에게 메시지를 보내라는 알림은 보내지 않는다.
- **다음 목표.** 진화해서 새 모습이 자리 잡으면 무대 위쪽에 다음 목표가 4.5초쯤 뜬다: "Lv.3에 알이 깨어나요", "Lv.5에 꼬마가 돼요",
  "Lv.10에 어른이 돼요", 어른이 되면 "Lv.12에 직업이 정해져요. 둘이 한 일에 따라 달라져요!"(`buddy.nextStage.*`, 레벨은 앱 `api.ts`의 `NEXT_STEP_AT`).
- **다 자람과 최고 레벨.** 20레벨이 되면 대화에 "다 자랐어요" 카드(`GROWN`)가 남고 독립시킬 수 있다. 독립은 **선택**이라 계속 키워도 된다. 카드와 Buddy 상세의 독립 안내, 도움말은 독립시키지 않고 60까지 키워도 방 소품이 레벨마다 계속 생기고 좋아진다고 알려준다.
  60이 되면 감사 카드(`MAX_LEVEL`)가 남고, 무대에 빛줄기·깃털과 함께 안내가 차례로 뜨며 우편함에 개발자의 편지가 온다. EXP는 계속 쌓여 기록되지만 레벨과 바는 멈춘다.
- **우편함.** 무대 모서리 버튼(늘 보임)으로 여는 공지·편지함. 내용은 앱에 넣어 배포로 보내고, 읽음은 기기에 둔다(`docs/fun-improvements.md`의 우편함).
- **독립과 앨범.** 20레벨 이상의 버디는 Buddy 상세(무대 이름 옆 🎓, 카드 버튼으로도 연다)에서 두 사람 중 누구든 확인 후 독립시킨다. 새 알의 이름을
  지으면 버디는 추억 앨범(이름, 함께한 기간, 직업)에 남고 무대에는 새 알이 온다. 앨범은 관계의 기록이지 수집 게임이 아니다.
- **도움말.** 돌보기, 자라기, 레벨 보상, 독립을 설명하는 화면(채팅 헤더 "?", 설정). 처음 들어오면 채팅 위에 안내 카드가 한 번 뜨고,
  Buddy 상세에 "다음 보상: Lv.6 은 밥그릇 · 2레벨 남았어요"가 보인다.

## 무대 꾸미기

성장·직업 레벨을 뺀 2~59의 모든 레벨에 하나씩(50개) 방이 조금씩 달라진다. 소품은 밀어내지 않고, 안 쓴 자리를 쓰거나 있던 것이 좋아진다(`stage-decor.tsx`의 `REWARDS`,
서버가 준 레벨로 앱이 고른다). 소품마다의 레벨과 그림은 `docs/fun-improvements.md`의 방 소품.

- 화분은 새싹(2) → 무성한 화분(13) → 꽃 핀 도자기(19) → 작은 나무(32) → 열매 달린 나무(45). 다음 화분이 오기 전까지 레벨마다 조금씩 커진다.
  Lv.13 화분은 꽃 핀 선인장·고무나무·산세베리아·둥근 잎 화분 중 하나로 자란다. 버디 이름으로 정해서 두 사람 화면이 같고 다시 열어도 그대로다.
- 밥그릇은 은(6) → 금(27) → 도자기(48). 꼬마부터는 밥상의 그릇이 같은 색이다.
- Lv.12에 직업이 정해지면 **직업 무대 장치**가 온다: 무대 왼쪽에 요리사 조리대, 정원사 큰 식물, 라디오 DJ 방송 책상, 작가 나무 책상, 바리스타 카페 카운터.
  장치는 늘 버디 앞에 있고 높이는 버디 입 바로 아래까지라 얼굴이 가려지지 않는다.
- 꼬마까지 비어 있는 왼쪽 바닥에는 나무 상자(4)가 오고 장난감 상자(8)가 된다. Lv.12에 직업이 정해지면 직업 장치가 반짝이며 그 자리에 온다(직업이 없는 어른은 장난감 상자 그대로).
- 무대 가운데의 러그는 알일 때부터 깔려 있고 무늬가 바뀐다. 바닥은 마루, 다다미로 바뀐다. 벽에는 창문(하늘이 기기 시각을 따른다)과 그 모서리의 덩굴 화분, 벽시계(뻐꾸기시계로 바뀐다)가 오고,
  오른쪽 위 벽 선반(오르골·라디오·책), 창틀(인형·다육이), 무드등 옆 협탁(어항), 가운데(좌탁)가 차례로 찬다. 창가 손님은 10가지.
- 몇 가지는 **철 따라** 기기 날짜로만 나온다(벚꽃잎, 풍령, 고추잠자리, 겨울의 코타츠, 설날의 가가미모찌). 레벨로 받고 철에만 꺼내며, 이름에 기간을 붙인다.
- 새로 온 소품은 그 자리에서 반짝이며 나타난다(무대를 연 뒤 오른 레벨의 것만).
- 독립하면 소품은 버디가 가지고 이사간다: 버디가 보따리를 메고 인사한 뒤 오른쪽으로 걸어 나가고, 원이 닫혔다 열리면 러그만 있는 빈 방에 새 알이 있다
  (`buddy-scene.tsx`). 보상은 지금 버디의 레벨로만 정한다.
- 독립시킨 버디는 벽에 걸지 않고 **추억 앨범**에 모은다: 우편함과 온천 버튼 사이의 앨범 버튼(독립한 버디가 있을 때)으로 여는 갤러리에
  직업 모습으로 웃는 사진이 파스텔 액자에 걸린다(`album-gallery.tsx`).

# 서버

## 스택

- Java 25, Spring Boot 4.1, Gradle(Kotlin DSL), Spring WebFlux, Reactor, Spring Data Reactive MongoDB.
- 로컬은 Docker Compose의 MongoDB(`bootRun` 때 자동 실행). 테스트는 JUnit 5, Testcontainers(MongoDB), WebTestClient.
- **Firebase ID token은 Admin SDK가 아니라 Spring Security reactive JWT로 검증한다.** Admin SDK의 `verifyIdToken`은 blocking이라서다.
  JWK set `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`,
  `iss` = `https://securetoken.google.com/<projectId>`, `aud` = `<projectId>`, `sub` = Firebase uid. 사용자 식별은 항상 `sub`.

## 패키지

```text
com.buddychat
 ├ common        공통 설정, 에러 응답
 ├ auth          SecurityConfig, 현재 사용자(uid)
 ├ user          User, /api/me
 ├ account       계정 삭제, 게스트 정리(여러 모듈의 service를 차례로 부른다)
 ├ support       문의·신고 접수, 대화 종료 복구, 운영자 이메일 알림
 ├ room          Room, Invitation, 멤버 관리
 ├ chat          Message, 히스토리 조회
 ├ buddy         Buddy 규칙과 상태 변경
 ├ realtime      WebSocket handler, 세션 레지스트리(메모리), 이벤트 전달
 └ notification  푸시 토큰, 새 메시지 알림(Expo 푸시, Web Push)
```

모듈끼리는 service로만 호출한다. 다른 모듈의 repository를 직접 쓰지 않는다.

## 컬렉션

```text
users          { _id, firebaseUid (unique), displayName, roomId?, createdAt, guest?, lastSeenAt?, roomJoinId? }
rooms          { _id, memberIds [1..2], memberCount, createdAt, closureId?, historyVersion?, album? [{ name, bornAt, graduatedAt, job? }],
                 buddy { name, exp, bornAt, lastFedAt?, lastCleanedAt?, poopsCleaned?, lastWorkedAt?, lastBathedAt?, expDay?, messageExpToday?,
                         talkDay?, talkers?, togetherDay?, fedCount?, cleanedCount?, nightCount?, laughCount?, loveCount?,
                         job?, jobChangedLevel? } }
messages       { _id, roomId, senderId?, type (TEXT | SYSTEM | BUDDY_EVENT), text?, buddyEvent?, systemEvent?, actorId?,
                 clientMessageId, createdAt }
invitations    { _id, roomId, code (unique), createdBy, createdAt, expiresAt, usedAt?, usedBy?, previousRoomId? }
reads          { _id: "<roomId>:<userId>", roomId, userId, messageId, updatedAt }
push_tokens    { _id: <Expo push token | Web Push endpoint>, userId, updatedAt, p256dh?, auth? }
settings       { _id: "buddy", expPerLevel }
supportTickets { _id: requestId, kind (INQUIRY | REPORT | REMOVE), reporterId, reporterName?, replyEmail?, reason?, description,
                 roomId?, roomSnapshot?, targetId?, targetName?, nextRoomId?, evidence [], createdAt, expiresAt, completedAt?,
                 closureConfirmed, emailStatus, emailAttempts, nextEmailAttemptAt }
history_deletions  계정 삭제 중 영향받는 방 id(삭제 진행 표식)
```

- **Buddy는 room에 embed한다.** room과 1:1로 생기고 지워지며 항상 같이 읽는다. 돌봄을 room 문서 하나의 atomic update로 처리한다.
- **트랜잭션·change stream·복잡한 aggregation에 기대지 않는다.** 동시성은 조건부 atomic update와 unique 인덱스로 해결한다.
- **멤버 최대 2명**: `updateOne({ _id, memberCount: { $lt: 2 }, memberIds: { $ne: uid } }, { $push: …, $inc: { memberCount: 1 } })`.
  수정된 문서가 없으면 가득 찬 것.
- **메시지 멱등성**: `{ roomId, senderId, clientMessageId }` unique 인덱스. 중복 키면 기존 메시지로 ack.
- **메시지 순서는 `_id` 하나로 정한다.** 히스토리(`{ roomId: 1, _id: -1 }`, `_id < cursor`), 재연결 복구, 타임라인 정렬, 읽음 위치가 모두
  같은 순서를 쓴다. 레플리카가 1개라 어긋날 수 있는 건 재배포 순간 같은 초에 만든 메시지뿐이다. 정확한 순서가 필요해지면 room별 sequence.
- **Buddy 상태는 조회 시점에 계산**한다(배고픔·💩은 `lastFedAt`·`lastCleanedAt`과 현재 시각). 스케줄러가 없다.
- 한 사용자는 room 하나에만 속한다(`users.roomId`).
- 새 필드는 기존 문서에 없으므로 nullable로 두고 없는 경우를 처리한다. 인덱스는 모듈별 `*Indexes` 클래스에서 명시적으로 만든다.

## REST API

모든 요청은 `Authorization: Bearer <Firebase ID token>`. 에러 응답은 `{ "code": "..." }`이고 문구는 앱이 정한다.

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/me` | 내 정보. 첫 호출 때 user 생성 |
| PATCH | `/api/me` | 이름 `{ displayName }`(1~20자) |
| DELETE | `/api/me` | 계정 삭제 → 204. Firebase 계정은 앱이 이어서 지운다 |
| POST | `/api/rooms` | 내 room 생성(solo, 알) |
| GET | `/api/rooms/me` | 내 room, 멤버, Buddy 상태, 앨범 |
| POST | `/api/rooms/me/invitations` | 초대 코드 발급 |
| POST | `/api/invitations/{code}/accept` | 초대 수락 → room 참가(`leaveCurrentRoom`) |
| POST | `/api/rooms/me/leave` | room 나가기 → 204 |
| GET | `/api/rooms/me/messages?before=&after=&limit=` | 타임라인(최신순, limit ≤ 50) `{ messages, hasMore }` |
| POST | `/api/rooms/me/buddy/feed` | 밥 → `{ buddy, changed }` |
| POST | `/api/rooms/me/buddy/clean` | 💩 하나 치우기 → `{ buddy, changed }` |
| POST | `/api/rooms/me/buddy/work` | 어른의 일 → `{ buddy, changed }` |
| POST | `/api/rooms/me/buddy/bath` | 온천 → `{ buddy, changed }`(12시간에 한 번 EXP, 알은 `false`) |
| POST | `/api/rooms/me/buddy/job` | 직업 바꾸기 `{ job }` |
| POST | `/api/rooms/me/buddy/graduate` | 독립 `{ buddyName }` → 새 알의 Buddy |
| POST | `/api/support/inquiries` | 문의 `{ requestId, description }` → 201 `{ id }` |
| POST | `/api/rooms/me/partner-removal` | 상대 신고·내보내기 `{ requestId, roomId, targetId, report, reason?, description }` → 201 `{ id }` |
| POST | `/api/me/push-tokens` | Expo 푸시 토큰 등록 `{ token }` → 204(다른 사용자의 토큰이면 옮긴다) |
| DELETE | `/api/me/push-tokens/{token}` | 토큰 삭제(자기 것만) → 204 |
| GET | `/api/me/web-push/key` | VAPID 공개 키 `{ publicKey }` |
| POST | `/api/me/web-push` | Web Push 구독 등록 `{ endpoint, p256dh, auth }` → 204 |
| DELETE | `/api/me/web-push?endpoint=` | 구독 삭제(자기 것만) → 204 |

| code | HTTP | 상황 |
| --- | --- | --- |
| `INVALID_REQUEST` | 400 | 요청 값 검증 실패, 모르는 직업 |
| `ROOM_NOT_FOUND` | 404 | room 없음 |
| `INVITATION_NOT_FOUND` | 404 | 없는 코드 |
| `INVITATION_EXPIRED` / `INVITATION_USED` | 410 | 만료 / 이미 사용 |
| `ROOM_ALREADY_EXISTS` | 409 | 이미 room이 있는데 만들려고 함 |
| `ROOM_FULL` | 409 | 2명이 찬 room |
| `ALREADY_MEMBER` | 409 | 자기 room의 초대를 수락 |
| `ALREADY_IN_ROOM` | 409 | 2명 room의 멤버가 다른 room에 참가 |
| `LEAVE_CONFIRMATION_REQUIRED` | 409 | solo room을 두고 참가하려면 확인 필요 |
| `BUDDY_NOT_GROWN` | 409 | 20레벨이 안 됐는데 독립 |
| `BUDDY_NOT_ADULT` / `JOB_UNCHANGED` / `JOB_CHANGE_LOCKED` | 409 | 직업 바꾸기 불가(직업이 정해지기 전, 같은 직업, 바꿀 수 있는 레벨이 아님) |
| `PARTNER_CHANGED` | 409 | 같은 `requestId`로 다른 신고 |
| `SUPPORT_RATE_LIMIT` | 429 | 1시간에 문의 5개 이상 |

## WebSocket 프로토콜

`wss://<host>/ws`. 브라우저 WebSocket은 헤더를 못 붙이므로 **첫 메시지로 인증**한다(token을 URL에 넣지 않는다). 서버가 먼저 `hello`를
보내고 클라이언트는 그 뒤에 `auth`를 보낸다(업그레이드 직후 보낸 프레임은 사라질 수 있다). 5초 안에 인증이 없으면 끊는다.

```text
client → server
  { type: "auth", token }
  { type: "send", clientMessageId, text }
  { type: "typing", typing }                      입력 중이면 3초마다 다시
  { type: "read", messageId }                     화면에 보이는 가장 최근 상대 메시지(또는 Buddy 이벤트)
  { type: "pet" }                                  쓰다듬기. 저장하지 않고 상대에게 전달만
  { type: "ping" }

server → client
  { type: "hello" }
  { type: "ready", userId, roomId, online, reads, historyVersion }
  { type: "ack", clientMessageId, message }       내 메시지 저장 완료(재전송이어도 같은 응답)
  { type: "message", message }                    상대 메시지, Buddy 이벤트
  { type: "member", userId, displayName }         친구가 참가(solo → duo)
  { type: "left", userId }                         친구가 나감(duo → solo)
  { type: "historyChanged", historyVersion, deletedUserId }  계정 삭제로 기록이 바뀜. 다시 읽는다
  { type: "buddy", buddy }                         Buddy 상태 변경
  { type: "typing", userId, typing }              다른 멤버에게만. 6초 동안 안 오면 앱이 지운다
  { type: "presence", userId, online }            그 사용자의 첫 연결이 열리거나 마지막 연결이 닫힐 때
  { type: "read", userId, messageId }             읽음 위치가 앞으로 움직였을 때만
  { type: "pet", userId }                          상대가 쓰다듬음. 다른 멤버에게만
  { type: "error", code }
  { type: "pong" }
```

- 연결 종료 에러: `UNAUTHORIZED`, `AUTH_TIMEOUT`, `ROOM_NOT_FOUND`, `TOKEN_EXPIRED`(토큰의 `exp`가 되면, 앱이 새 토큰으로 재연결).
  연결 유지 에러: `INVALID_MESSAGE`(빈 문자열·2000자 초과), `INVALID_EVENT`, `INVALID_REQUEST`.
- 토큰은 연결할 때 한 번 확인한다. 즉시 폐기는 토큰 수명(1시간)만큼 늦는 걸 허용한다.
- 연결은 인증 시점의 room에 묶인다. room이 바뀌면 앱이 다시 연결한다. 한 연결의 이벤트는 순서대로 처리한다.
- **재연결 복구**(`features/chat/message-sync.ts`): REST로 연속해서 확인한 마지막 메시지 이후를 `after`로 채운다. 실시간 메시지는 화면에 바로
  합치되 복구 커서는 움직이지 않는다. 페이지가 성공하면 커서를 전진, 실패하면 그 위치에서 3초 뒤 다시(요청 제한 15초). 한 번에 하나만 돌고,
  재연결·종료 때 진행 중인 요청을 취소한다. 복구 중에는 읽음을 보내지 않는다. ack 못 받은 메시지는 `ready`에서 같은 `clientMessageId`로 바로 다시 보낸다.
- 세션·presence·typing은 서버 메모리에만 둔다(재배포하면 사라진다). presence는 연결로 계산하고 기기 여러 대는 하나로 본다.
- **읽음**은 앞으로만 움직인다: `messageId < 새 id` 조건부 upsert. 첫 읽음이 동시에 와서 중복 키가 나면 같은 조건으로 한 번 더 update한다.
  앱은 상대가 읽은 위치 이하인 내 메시지 중 가장 최근 것에 "읽음"을 표시한다.
- 유휴 연결 타임아웃 때문에 서버가 25초마다 ping 프레임을 보낸다.

## Buddy 규칙

수치는 `buddy/BuddyRules.java`, 주기는 서버 설정(`buddychat.buddy.full-to-empty`, `poop-every`, `exp-per-level`). 테스트는 숫자 대신
`BuddyRules.hungryAfter()`, `poopEvery()`로 시간을 보낸다. 앱은 `BuddyView`(level, stage, fullness, poops, canFeed, canClean, talkedToday,
togetherToday, job, leaning, canChangeJob, jobChangeAt, grown)를 그대로 보여준다.

- **배고픔**: 밥을 먹은 뒤 2시간 30분에 걸쳐 100 → 0. 80 미만(30분 뒤)이면 밥을 줄 수 있고, 30 이하(1시간 45분 뒤)면 배고프다.
- **💩**: 바닥이 깨끗해진 뒤(`lastCleanedAt`) 1시간마다 하나, 최대 3개. 누를 때마다 하나씩 치운다(`poopsCleaned` 증가, 마지막 하나면
  `lastCleanedAt`을 지금으로 옮겨 새 주기). 채팅의 "청소"는 한 번에 다 치운다. 어른은 💩이 생기지 않는다.
- **일**: 어른만. 언제든 할 수 있지만 +2 EXP와 타임라인 `WORKED`는 `lastWorkedAt`에서 1시간이 지났을 때만(조건부 update라 동시에 눌러도 한 번).
- **온천**: 알이 아니면. 앱이 온천에 들어설 때 보낸다. +3 EXP와 타임라인 `BATHED`는 `lastBathedAt`에서 12시간이 지났을 때만(방에 하나, 조건부 update). 온천에 있는지는 저장하지 않는다.
- **채팅으로 돌보기**(`CareCommand`): 메시지 전체가 "밥"·"🍚"·"ごはん"·"food"면 밥, "청소"·"🧹"·"そうじ"·"clean"이면 청소, 어른에게 "일"·"💼"·"仕事"·"work"면 일.
  끝의 "!", "~", "."는 괜찮고 문장 안의 단어는 아니다. 보낸 사람이 한 것으로 처리하고, 메시지는 그대로 남고 EXP도 받는다.
- **경험치**: 밥 +2, 💩 하나 +2, 일 +2(1시간에 한 번), 온천 +3(12시간에 한 번), 메시지 +1(room당 하루 50까지, 일본 시간). 레벨 = `exp / 레벨당 EXP + 1`, 최고 60.
  단계는 `BABY_AT` 3, `CHILD_AT` 5, `ADULT_AT` 10, 독립은 `GRADUATE_AT` 20부터.
- **레벨당 EXP를 바꿔도 레벨은 그대로**(`BuddyExpScale`): 서버가 시작할 때 `settings`에 기록한 값과 다르면 모든 Buddy의 EXP를
  `exp × 새 값 ÷ 옛 값`(내림)으로 바꾼다. 새 값을 조건부 update로 먼저 기록하므로 서버 두 대가 같이 떠도 한 번만 바꾼다. 트래픽 전 1회성이라 blocking.
- **둘이 함께**: 같은 날(일본 시간) 두 사람이 모두 메시지를 보내면 하루 한 번 +10(메시지 상한과 별개, 혼자인 방은 없음). 메시지마다 보낸 사람을
  그날 목록(`talkDay`, `talkers`)에 넣고, 그날 처음인 사람이면 둘 다 있고 `togetherDay`가 오늘이 아닐 때만 주는 조건부 update를 한다.
  주면 타임라인 `TOGETHER`, 아니면 `buddy` 이벤트만 보내서 상대 화면에 누가 왔는지 보인다. 독립으로 온 새 알은 그날 기록을 이어받는다.
- **타임라인 이벤트**: `FED`, `CLEANED`(바닥이 깨끗해질 때), `WORKED`, `TOGETHER`, `LEVELED_UP`(단계가 바뀌면 대신 `EVOLVED`, 20이면 대신
  `GROWN`, 60이면 대신 `MAX_LEVEL`), `JOB`, `JOB_CHANGED`, `GRADUATED`는 일어날 때 남긴다. `HUNGRY`, `POOPED`는 누군가 room을 읽거나 연결할 때 원인 시각으로 만든
  키(`buddy:hungry:<lastFedAt>` 등)로 남겨서 메시지 unique 인덱스로 한 번만 기록된다. 진화·레벨 키에는 버디의 `bornAt`이 들어간다.
- **동시성**: 밥은 `lastFedAt < 지금 - 30분` 조건부 update, 청소는 읽은 `lastCleanedAt`·`poopsCleaned`가 그대로일 때만 바꾼다. 진 쪽은
  `changed: false`와 현재 상태를 받는다. 변화는 room 전체에 `message`와 `buddy` 이벤트로 간다.
- **직업**: 고르지 않고 키운 방식에서 정해진다. 서버가 센다: 밥 준 횟수(`fedCount`), 치운 💩(`cleanedCount`), 밤(일본 시간 23~7시) 메시지
  (`nightCount`), 웃음·사랑 낱말이 든 메시지(`laughCount`·`loveCount`, 둘 다면 사랑만, 낱말은 `buddy/MoodWords`와 앱 `chat-words.ts`를 같이 고친다).
  판정은 `BuddyJob`: 직업마다 버릇의 횟수를 **보통 그 레벨까지 하는 양**(밥 5, 💩 4, 밤 메시지 6, 사랑 메시지 3)에 견준다
  (점수 = 횟수 × 60 ÷ 보통 양). 밥처럼 자주 생기는 일이 횟수만으로 이기지 않게 해서 다섯 직업이 골고루 나오게 하려는 것이다.
  보통보다 가장 많이 한 버릇의 직업이 되고, 어느 버릇도 보통의 1.25배에 못 미치면 바리스타 `BARISTA`(이것저것 고루 하는 버디).
  점수가 같으면 버디의 `bornAt`으로 정한 제비뽑기라 같은 버디는 늘 같다. 웃음은 세기만 하고 직업에 쓰지 않는다.
  보통 양은 둘이 이틀, 혼자 사흘쯤에 Lv.12에 닿는다고 보고 정한 값이라, 실제 분포를 보고 고친다.
  - 어른(Lv.10)이 되고 조금 뒤 **Lv.12**(`JOB_AT`)에 한 번 `job`을 정한다(`bornAt`이 같고 `job`이 없을 때만). 막 어른이 된 모습(머리의 꽃)을
    먼저 즐기게 하려고 나눴다. 타임라인은 `LEVELED_UP`(12) 다음에 `JOB`.
  - 직업이 정해지기 전(꼬마, Lv.10~11의 어른)에는 지금까지의 점수로 기울기(`leaning`)만 준다.
  - **바꾸기**(`POST …/buddy/job`): 두 멤버 누구든 **Lv.20·30·40·50에 한 번씩**(20~29, 30~39, 40~49, 50~59 구간마다 한 번, `jobChangedLevel`에
    바꾼 레벨), **Lv.60부터는 언제든**. 한 직업에 질리지 않게 10레벨마다 기회를 주고, 정해진 직업과 합쳐 다섯 직업을 모두 거쳐 볼 수 있다. 바꿀 수 없을 때 `jobChangeAt`이 다음 기회의 레벨이다.
    정해진 직업은 치지 않는다. Lv.12가 지났는데 직업이 없는 버디(직업이 생기기 전의 버디, 나중 업데이트로 생기는 경우)는 언제든 첫 직업을 고르고,
    그것도 치지 않는다. 조건부 update 하나(읽은 직업, 구간 안이면 그 구간에 바꾼 적 없음)라 동시에 해도 한 번. 타임라인 `JOB_CHANGED`
    (`actorId` = 바꾼 사람). 점수는 계속 센다.
  - 바꿀 때를 중간중간 알린다. 대화: Lv.12의 직업 카드(바꿀 수 있는 레벨), Lv.20의 "다 자랐어요" 카드, Lv.30·40·50의 레벨 업 줄
    ("🔄 직업을 한 번 바꿀 수 있어요"), Lv.60 카드("이제 언제든"). 무대 위 안내(4.5초): 기회 바로 전 레벨("다음 레벨(Lv.20)에 직업을 바꿀 수 있어요"),
    기회가 온 레벨, 직업이 정해지거나 바뀐 뒤("다음 직업 바꾸기는 Lv.30부터예요"), Lv.60("이제 언제든"). Buddy 상세도 다음 기회를 보여준다.
  - 직업 값을 바꾸려면 저장된 곳(`buddy.job`, 앨범의 `job`, 타임라인 `JOB`·`JOB_CHANGED`의 `text`)을 함께 옮겨야 한다.
- **독립**(`POST …/buddy/graduate`): `grown`(20레벨 이상)일 때만. 지금 버디를 `album`에 push하고 `buddy`를 새 알로 바꾸는 것을 조건부 update 하나로
  한다(같은 `bornAt`이고 20레벨 이상일 때만). 진 쪽은 `BUDDY_NOT_GROWN`. 타임라인 `GRADUATED`, 상대 앱은 room을 다시 읽는다.

## Room·초대 규칙

- 방 생성은 room 저장 → `users.roomId: null, roomJoinId: null` 조건으로 연결. 동시 생성에서 연결하지 못한 후보 room은 지운다.
- 초대 코드: 8자리(0/O, 1/I/L 제외), 24시간 유효, 한 번만, 대소문자 무시. 초대 링크는 `<웹 주소>/join?code=<코드>`. 웹이 로그인 전에
  코드를 기억했다가 이름을 정한 뒤 참가 화면을 연다(`lib/pending-invite`).
- solo room이 있는 사람이 수락하면 `LEAVE_CONFIRMATION_REQUIRED`. 앱이 "지금 Buddy는 사라져요"를 확인받고 `leaveCurrentRoom: true`로 다시 요청하면
  참가하고 기존 solo room은 지워진다. 2명 room의 멤버는 먼저 나가야 한다(`ALREADY_IN_ROOM`).
- **나가기**: 2명 room이면 남은 사람이 room과 Buddy를 갖고 `left`와 SYSTEM `MEMBER_LEFT`(text = 나간 사람 이름)를 받는다. 혼자 room이면
  room·Buddy·기록이 지워진다. 순서는 room에서 빼기(조건부) → 사용자 roomId 비우기(조건부) → 빈 room이면 삭제와 기록 삭제. 다시 나가면 중간에 멈춘 나가기를 끝낸다.
- **참가 동시성**: 초대 사용(`usedAt: null`) → 사용자 예약(`roomJoinId`) → 참가(`memberCount < 2`) → 예약과 기존 roomId를 확인하며 새 roomId 설정
  → 기존 room 나가기. 진 쪽은 자기 초대 사용과 예약을 되돌린다. 예약 중에는 방 생성도 거절하고, 예약만으로는 새 room에 접근할 수 없다.
  초대에 `previousRoomId`를 남겨 중간 실패 뒤 같은 코드로 다시 수락하면 이어서 끝낸다.

## 문의·신고와 상대 내보내기

- 접수는 인증 필요, 내용 1~4000자. 문의는 이용자당 1시간에 5개까지(`SUPPORT_RATE_LIMIT`), 신고·내보내기는 제한이 없다.
- 앱이 만든 UUID `requestId`가 접수 문서의 키다. 같은 요청의 재시도는 이어서 끝내고, 작성자·방·대상·유형이 다르면 `PARTNER_CHANGED`.
- `roomId`·`targetId`가 지금의 방과 상대인지 확인한다. 신고만 최근 TEXT 최대 50개를 복사한다. 접수를 먼저 저장하고 방의 `closureId`를 조건부로
  설정해서 둘이 동시에 요청해도 한 작업만 방을 닫는다.
- 요청자는 새 solo 방 id로 Buddy·앨범을 옮긴다. 대상의 방 포인터, 모든 기존 초대와 예약, 기존 방, 메시지·읽음 위치를 지우고 두 사람의 소켓을
  닫는다. 메시지·읽음·Buddy·소켓 이벤트는 현재 멤버십을 확인하므로 예전 토큰이나 소켓으로 권한이 살아나지 않는다.
- 서버 중단으로 남은 접수는 60초마다 이어서 처리한다. 접수는 `expiresAt` TTL로 90일 뒤 지워진다. 자료를 조회하는 공개 API는 없다.
- 운영자 메일은 Gmail API(`gmail.send`, HTTPS)로 보낸다(호스팅의 SMTP 제한). 60초마다 최대 10건을 임대해 보내고 실패하면 2~60분 간격으로
  재시도한다. Gmail 설정이 없거나 장애여도 접수와 안전 조치는 동작하고 health에는 영향이 없다. 환경변수와 운영은 아래 운영.

## 계정 삭제

App Store Guideline 5.1.1(v) 때문에 있다. 게스트는 Firebase가 30일 뒤 지우지만 서버 데이터는 남으므로 스스로 지울 방법이 필요하다.

- 서버(`DELETE /api/me`, `account/AccountService`): 삭제 진행 표식 → room 나가기 → 내가 만든 초대 → 모든 방의 본인 메시지·작성자 정보 → 내 읽음 위치
  → 푸시 토큰 → 사용자 문서 → 표식 순으로 지운다. 단계마다 다시 해도 되는 삭제라 중간에 실패해도 다시 요청하면 끝난다.
- 본인 텍스트와 본인 이름이 든 SYSTEM 기록은 예전에 나간 방까지 지운다. Buddy 이벤트는 작성자 id만 지우고 `buddy.talkers`에서도 뺀다.
- 바뀐 방은 `historyVersion`을 올리고 `historyChanged`를 보낸다. 앱은 기록을 비우고 다시 읽으며, 재연결의 `ready.historyVersion`이 달라도 같다.
  삭제 표식이 있는 동안 늦게 저장된 이름 기록·작성자 id도 지우고 그 방을 다시 갱신한다.
- 앱: 연결한 계정은 먼저 다시 로그인한다(Firebase는 최근 로그인 뒤에만 계정 삭제를 허용한다). Apple은 이때 토큰을 취소한다(iOS는
  `accounts:revokeToken`에 인증 코드를 보낸다. 실패하면 서버 삭제 전에 멈춘다). 그다음 서버 삭제 → Firebase `deleteUser`.
  Firebase 삭제가 실패하면 로그아웃하지 않고 알린다. 다시 누르면 서버 삭제는 같은 결과로 끝난다.

## 게스트 정리

서버가 **매주 월요일 04:00(일본 시간)** 정리한다(`account/GuestCleanup`, `@Scheduled`). 서버가 항상 켜져 있어서 가능하고, 두 번 돌아도 같다.

- 게스트 판단: 토큰의 `firebase.sign_in_provider`가 `anonymous`이고 `firebase.identities`가 비어 있으면 게스트.
- 인증된 요청마다 `guest`와 `lastSeenAt`을 적는다(하루 한 번까지, 게스트 여부가 바뀌면 바로). `guest=true`는 만들 때만 적고 연결 뒤에는 `false`로만
  바꾼다(연결 전 토큰이 다른 기기에 남아 있어도 되돌리지 않는다). 계정을 연결한 직후 앱이 `GET /api/me`를 한 번 부른다.
- 대상: 게스트이고, 만든 지 30일이 지났고, 7일 동안 요청이 없는 사용자. 지우는 방법은 계정 삭제와 같다. 이 필드가 없는 옛 사용자는 건드리지 않는다.
- 첫 단계에서 사용자가 이미 없는 고아 삭제 표식을 지운다.

## 푸시 알림

- **무엇을**: 상대의 새 텍스트 메시지만. 제목은 보낸 사람 이름, 본문은 메시지(180자까지).
- **누구에게**: 저장 **3초 뒤에도 그 메시지까지 읽지 않은** 다른 멤버의 모든 기기. 채팅을 보고 있는 앱은 1초 안에 읽음을 보내므로 가지 않는다.
  접속 여부로 판단하지 않는 이유: iOS가 앱을 멈춘 뒤 서버가 끊김을 알기까지 수십 초 동안 접속 중으로 보인다. 전송(ack)은 알림을 기다리지 않는다.
- **앱 푸시**: 앱이 `expo-notifications`로 받은 Expo 푸시 토큰을 등록하고 서버가 Expo 푸시 API로 보낸다(APNs 키는 EAS가 관리). ticket과 약 15분 뒤의
  receipt에서 `DeviceNotRegistered`면 토큰을 지운다(receipt 확인은 메모리 지연 실행이라 재배포하면 빠질 수 있다).
- **끄기**: 앱 설정의 알림 스위치는 기기별이다. 끄면 그 기기 토큰을 서버에서 지운다. 서버에 사용자별 알림 설정은 없다.
- 설정: `buddychat.push.grace-period`(3s), `receipt-delay`(15m), `expo-access-token`.

### 웹 푸시

- 웹 앱은 `public/manifest.webmanifest`로 설치할 수 있고 `public/sw.js`(서비스 워커)가 알림을 띄우고 누르면 채팅을 연다. 설정의 알림 스위치에서만 권한을
  묻는다. 켜면 서버 키로 구독해 등록하고, 끄거나 로그아웃하면 지운다. 앱을 열 때마다 다시 구독한다.
- 아이폰은 iOS 16.4부터, 홈 화면에 추가한 웹 앱에서만 받는다(Safari에서는 설정 카드가 방법을 안내한다).
- 서버(`notification/WebPush`, `WebPushCrypto`): RFC 8291(aes128gcm)로 암호화하고 VAPID(RFC 8292, ES256)로 서명해 WebClient로 보낸다. JDK 암호화만
  쓴다. 404/410이면 구독을 지운다. endpoint는 알려진 푸시 서비스(FCM, Mozilla, Apple, Windows)의 https 주소만 받는다(SSRF 방지).
- VAPID 키는 Terraform `tls_private_key`(P-256)로 만들어 서버 `.env`에 넣는다. 없으면 실행마다 임시 키(로컬 개발).

## 인프라

```text
iPhone / Web ──HTTPS·WSS──▶ AWS Lightsail (Caddy → Spring WebFlux, Docker, 시드니) ──▶ MongoDB Atlas M0 (시드니)
웹 앱: Cloudflare Worker (정적 자산)            DNS·Terraform state: Cloudflare (puny-chat.com, R2)
외부: Firebase Authentication, Web Push 서비스, Expo 푸시
```

- **서버**: Lightsail 인스턴스(`quant-lab-02`, ap-southeast-2, 2GB + 스왑 2GB, 고정 IP)의 Docker Compose(`server/deploy`, 인스턴스 `/opt/puny-chat`).
  컨테이너는 서버(복제 1: 연결·presence·typing이 메모리에 있다)와 Caddy(80/443, 인증서 자동, WebSocket 전달). 다른 서비스(quant-lab, ur-check)와
  나눠 쓰므로 힙 `-Xmx384m`·SerialGC, 컨테이너 640MB로 제한한다. 항상 켜져 있어 콜드 스타트가 없다(앱의 미리 깨우기 `lib/warm-up.ts`는 남겨 둔다).
  서버 설정은 인스턴스의 `/opt/puny-chat/.env`(견본 `server/deploy/.env.example`)에만 있다. 방화벽은 80·443만 열고 SSH는 Lightsail 브라우저 연결만 허용한다.
- **DB**: Atlas M0(무료, 512MB, 초당 100 ops), 서버와 같은 시드니. 접근 목록은 Lightsail 고정 IP 하나, 비밀번호(Terraform이 만들어 서버 `.env`로만)와 TLS.
  인스턴스를 바꾸면 고정 IP를 옮기거나 `var.server_ip`를 바꿔 다시 apply한다. M0는 자동 백업이 없다.
- **웹 앱**: Cloudflare Worker의 정적 자산(`app/wrangler.jsonc`). `pnpm build:web`이 `expo export -p web` 뒤에 `scripts/worker-assets.mjs`로 404 페이지와
  `_headers`(서비스 워커 no-cache 등)를 만든다. 커스텀 도메인은 wrangler 배포가 붙인다(같은 이름의 CNAME이 있으면 안 된다).
- **도메인**: 웹 `puny-chat.com`(Worker), 서버 `api.puny-chat.com`(고정 IP를 가리키는 A 레코드, 프록시 없음, 인증서는 Caddy가 HTTP-01로). Cloudflare Registrar.
  Firebase 승인된 도메인에 웹 도메인이 있어야 Google 로그인이 된다. 서버 CORS에는 웹 도메인과 로컬 Expo dev 서버.
- **Terraform**(`infra/`, `infra/README.md`): Atlas 프로젝트·M0·DB 사용자·접근 목록, Cloudflare DNS, VAPID 키. state는 R2, 인증 정보는 `infra/.env`.
  Lightsail 인스턴스는 나눠 쓰므로 Terraform이 만들지 않는다.
- **CI**(`.github/workflows/ci.yml`): Actions 무료 분을 아끼려고 `dev`로 가는 PR과 `main` push에서만 돌고, 문서·`infra/`만 바뀌면 건너뛴다.
  바뀐 폴더(`app/`, `server/`)의 잡만 돈다. `main`에서는 마지막으로 CI를 통과한 `main` 커밋과 비교한다(취소된 실행의 변경도 검사하도록).
- **배포**(`.github/workflows/deploy.yml`): `main` CI가 통과하면(건너뛴 잡은 막지 않는다) 서버 이미지를 GHCR(`ghcr.io/ottuck/puny-chat-server`,
  `latest`와 sha 태그, 패키지는 Public)에 올리고 웹은 `wrangler deploy`한다. 인스턴스의 systemd 타이머가 1분마다 `server/deploy/update.sh`로 새 이미지를
  받아 컨테이너를 다시 만든다(CI는 SSH로 들어가지 않는다). `update.sh`가 실행 중인 커밋을 Caddy의 `/_revision`에 내놓으면 CI가 그 값이 방금 올린 sha가
  될 때까지 기다린 뒤 health를 본다. 서버는 `/_revision`의 커밋에서 `server/`가 바뀌었을 때만 다시 배포한다(새 배포는 모든 WebSocket을 끊는다).
  수동 실행(`workflow_dispatch`)은 늘 배포한다. 롤백은 인스턴스에서 `compose.yaml`의 이미지 태그를 이전 sha로 바꾸고 타이머를 멈춘 뒤 `docker compose up -d`.
  GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. 변수: `EXPO_PUBLIC_*`(빌드에 들어가는 공개 값).
- **쓰지 않는 것**: Redis(레플리카 1개라 메모리로 충분하다. 수평 확장이 필요하면 `RoomHub.publish` 뒤에 Pub/Sub), 파일 저장소(사진은 MVP 밖,
  넣으면 바이너리는 R2), 전용 VM, self-hosted MongoDB, Kubernetes, Kafka.

# 포트폴리오로서

poke-chat(Express + Socket.IO, 익명 글로벌 채팅, 세션 랜덤 ID, Redis 캐시, 재전송 중복)을 새로 설계한 프로젝트다. 보여줄 것: Spring WebFlux로
장시간 연결을 다루는 reactive 서버, WebSocket과 첫 메시지 인증, 재연결과 멱등성, 트랜잭션에 기대지 않는 동시성(조건부 update + unique 인덱스),
presence, 푸시, 모바일 생명주기, 크로스플랫폼.

# 운영

## 문의·신고

공개 연락처는 `support@puny-chat.com`이고, 외부에서 보낸 메일은 Cloudflare Email Routing이 운영자에게 전달한다. 앱의 문의·신고 알림은 서버 `.env`
(Lightsail `/opt/puny-chat/.env`)의 `SUPPORT_EMAIL` 메일함으로 직접 보낸다. 개인 발신·수신 주소는 저장소에 적지 않고 서버 `.env`로만 관리한다.
이용자는 앱에서 접수 완료와 접수 번호를 본다. 개별 이메일 답장, 답장 주소 입력란, 자동 회신, 관리자 페이지는 없다.

### Gmail 연결

호스팅은 SMTP를 막는 경우가 많아(AWS는 25번 포트를 기본 제한한다) Gmail API(HTTPS)로 보낸다. Gmail 앱 비밀번호로는 연결되지 않는다.
운영자 한 계정의 발송 권한만 쓰며, 앱 이용자의 Google 로그인에는 Gmail 권한을 더하지 않는다.

1. Google Cloud 프로젝트에서 Gmail API를 켠다. 운영자 발송용 OAuth 웹 클라이언트를 따로 만들고 승인된 리디렉션 URI로
   `https://developers.google.com/oauthplayground`를 등록한다.
2. [Google OAuth Playground](https://developers.google.com/oauthplayground/) 설정에서 **Use your own OAuth credentials**를 켜고 그 클라이언트 ID·secret을
   넣는다. Playground 기본 클라이언트로 받은 토큰은 24시간 뒤 취소되므로 쓰지 않는다.
3. 권한은 `https://www.googleapis.com/auth/gmail.send`만 고른다. 발송 계정으로 승인하고 authorization code를 교환해 refresh token을 받는다.
   OAuth 앱이 External / Testing이면 refresh token이 7일 뒤 만료될 수 있으므로 Production으로 둔다.
4. 인스턴스의 `/opt/puny-chat/.env`에 아래 다섯 값을 적고 `docker compose up -d`로 컨테이너를 다시 만든다. 인증 값과 개인 메일 주소는 Git·PR·문서에 적지 않는다.
5. 앱에서 문의 한 건을 접수하고 운영자 Gmail에서 접수 번호와 수신을 확인한다.

| 변수 | 용도 |
| --- | --- |
| `GMAIL_CLIENT_ID` | 운영자 발송용 OAuth 클라이언트 ID |
| `GMAIL_CLIENT_SECRET` | 그 클라이언트의 secret |
| `GMAIL_REFRESH_TOKEN` | 발송 계정으로 승인한 refresh token |
| `SUPPORT_FROM` | 승인한 운영자 Gmail 발송 계정. 기본값 없음 |
| `SUPPORT_EMAIL` | 운영자 알림을 받을 메일함. 기본값 없음 |

- 값이 비어 있어도 접수와 신고 조치는 동작하고 메일은 기다렸다가 등록 뒤 보낸다. 실패한 메일은 2~60분 간격으로 다시 보낸다.
  비밀번호 변경·권한 취소·토큰 만료로 승인이 풀리면 다시 연결한다. 서버가 DB 기록 전에 멈추면 같은 알림이 두 번 갈 수 있으니 접수 번호로 확인한다.
- Cloudflare 라우팅 주소는 수신·전달용이라 그것만으로 발송 계정이 생기지 않는다. 발신 Gmail과 전달 대상 Gmail이 같으면 중복 처리될 수 있어
  서버 알림은 메일함에 직접 보낸다. 발송 계정을 바꾸면 발송 변수와 인증 정보를 함께 바꾼다.
- Terraform은 Gmail 변수를 관리하지 않는다. `.env`는 인스턴스에만 있으므로 인스턴스를 다시 만들 때 옮긴다.

### 접수 뒤 대응

- Gmail에서 내용·신고 사유·관련 사용자·접수 번호를 본다. 신고 알림에는 삭제 전 최근 텍스트 최대 50개가 들어 있다.
- 신고가 끝나면 서버가 상대를 내보내고 기존 초대와 두 사람의 대화를 지운다. 신고자는 Buddy·앨범을 갖고 새 solo 방에서 계속 쓴다.
  신고 없는 내보내기는 사본과 메일을 만들지 않는다. 계정 이용 제한은 자동 조치에 없다.
- 메일이 오지 않으면 Atlas 콘솔의 `supportTickets`에서 `_id`(앱 접수 번호)로 찾아 `emailStatus=PENDING`, `emailAttempts`, `nextEmailAttemptAt`을 본다.
  본문을 로그나 공개 이슈에 옮기지 않는다. 서버가 정상이면 끝나지 않은 종료 작업도 스스로 다시 한다.
- 접수 기록·신고 사본은 90일 뒤 DB에서 자동으로 지워진다. Gmail의 메일 사본은 지워지지 않으니 대응 뒤 필요 없으면 운영자가 지운다.
  개인정보 요청은 본인 확인 뒤 필요한 범위에서 처리한다.

### 심사 설명에 쓸 사실

초대 코드로 연결되는 최대 2인 텍스트 채팅이며, 채팅 헤더와 설정에서 상대를 신고할 수 있다. 신고와 동시에 대화를 끝내고 상대의 접근·초대와
전체 대화 기록을 지운다. 운영자는 신고 자료를 이메일로 확인하며 개별 답장은 보내지 않는다. 개인정보처리방침과 연락처는 로그인 없이 공개한다.
관리자 페이지, 콘텐츠 사전 필터, 영구 이용 제한은 없다. 지금 구현이 심사 지침 1.2의 모든 요건을 충족한다고 약속하지 않는다.

참고: [Gmail API 발송](https://developers.google.com/workspace/gmail/api/guides/sending),
[Google OAuth 토큰 정책](https://developers.google.com/identity/protocols/oauth2),
[Apple 심사 지침](https://developer.apple.com/app-store/review/guidelines/).
