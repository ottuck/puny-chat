# puny-chat 아이콘

사용자가 선택한 2번 시안(크림색 일러스트)을 사용한다. 크림 배경은 `#FDF9E8`이다.
모서리는 이미지에 그리지 않고 운영체제가 마스킹한다. 앱 안의 Buddy 도트는 유지한다.

원본은 `brand/`에 보관한다:

- `puny-icon-source.png`: 선택한 시안 그대로. iOS·일반 웹 아이콘에 사용한다.
- `puny-character.png`: ImageGen으로 크림 배경만 제거한 투명 캐릭터.
- `puny-monochrome.png`: ImageGen으로 만든 투명 단색 캐릭터. 눈·입은 투명한 구멍이다.
- `imagegen-prompts.md`: 내장 도구의 편집 프롬프트.

`app/`에서 `pnpm icons`로 모든 PNG를 다시 만든다(Node 24+, Expo CLI에 포함된 이미지
처리 런타임 사용, 추가 설치 없음). 원본을 교체하면 이 명령을 다시 실행한다.

- `images/icon.png`: 공용·iOS, 1024×1024 sRGB RGB PNG, 투명도 없음.
- `images/android-icon-*.png`: 1024×1024 배경·투명 전경·단색 전경. 캐릭터는 중앙 66/108 안전 원 안에 둔다.
- `images/splash-icon.png`: 256×256 투명 PNG. 스플래시 배경은 앱의 라이트·다크 배경을 따른다.
- `images/favicon.png`: 48×48. 웹 설치 아이콘은 `public/`의 180·192·512 PNG.
- `public/icon-maskable-512.png`: 별도의 여백을 둬 중앙 80% 안전 원 안에 캐릭터를 배치한다.
- `public/badge.png`: 웹 알림용 투명 단색 캐릭터.

설정은 `app.json`, 웹 설치 정보는 `public/manifest.webmanifest`에서 연결한다.
iOS는 Expo 기본 `.icon` 번들 대신 PNG를 사용한다. 아이콘·스플래시 변경은 네이티브
재빌드가 필요하다. App Store Connect의 아이콘은 새 빌드를 업로드하면 가져온다.
