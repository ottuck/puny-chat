# 보관한 도트 시안

쓰지 않기로 했지만 나중에 쓸 만한 그림이다(레벨 보상을 더 잘게 나눌 때, 상점 같은 요소를 들일 때). 격자는 `sprites.ts`와 같은
규칙(문자 = 팔레트 키, `.` = 투명, 행 길이가 모두 같음)이고 팔레트는 각 제목에 적었다. 코드에 넣을 때는 `// prettier-ignore`를 붙인다.

비교 그림: [plants-and-meals.png](art-archive/plants-and-meals.png)(2단계 화분 후보와 식사 방식, 2026-10-15)

## 2단계 화분 후보 (2026-10-15)

2단계 화분(Lv.15)은 꽃 핀 선인장으로 정했다. 아래는 그때의 후보와 그 전의 2단계 화분이다. 옛 2단계(둥근 잎을 겹친 것)는
버디 머리의 잎과 같아 어색해서 바꿨다.

고무나무(반들한 타원 잎이 줄기를 따라 번갈아), `PROP_PALETTE`:

```
....kgggk....
...kiiiiik...
...kGGGGGgk..
...kggqGGigk.
..kgGiqkGGigk
.kPiGGqkkkGk.
kGiGGkqGPgk..
.kkkggqGGigk.
.kggiGqkGGiGk
kgPiGGqkkkGk.
kGGGkkqk..k..
.kkk.kqk.....
kkkkkkkkkkkkk
kwoooooooooek
kkkkkkkkkkkkk
.kooooooooek.
.kooooooooek.
..kooooooeek.
..kkkkkkkkk..
```

산세베리아(뾰족한 잎, 가로 줄무늬), `PROP_PALETTE`:

```
........k....
.....k.kgk...
....kgkgjk...
...kgjkgjk.k.
..kkgjkPgkkgk
.kgkPgkgjkgjk
kgjkgjkgjkgjk
kgjkgjkPgkPgk
kPgkPgkgjkgjk
kgjkgjkgjkgjk
kgjkgjkPgkPgk
kPgkPgkgjkgjk
kkkkkkkkkkkkk
kwoooooooooek
kkkkkkkkkkkkk
.kooooooooek.
.kooooooooek.
..kooooooeek.
..kkkkkkkkk..
```

옛 2단계 화분(둥근 잎), `PROP_PALETTE`:

```
..kkk...kkk..
.kPggk.kggPk.
.kgGGGGGGGgk.
.kkkkkGkkkkk.
kPggk.G.kggPk
kgGGGkGkGGGgk
.kkkkkGkkkkk.
..kPggGggPk..
..kgGkGGGgk..
...kkkGkkk...
kkkkkkkkkkkkk
kwoooooooooek
kkkkkkkkkkkkk
.kooooooooek.
.kooooooooek.
..kooooooeek.
..kkkkkkkkk..
```

## 도시락 (2026-10-15)

어린이·어른의 식사는 낮은 밥상으로 정했다. 바닥 천 위의 도시락은 장난감처럼 보여서 쓰지 않았다. 밥(매실), 달걀말이, 브로콜리,
소시지와 젓가락. `PROP_PALETTE`에 `R`(#B8423A, 칠한 도시락)을 더해야 한다.

```
....kkkkkkkkkkkkkk......
....kRRRRRRRRRRRRk......
....kRwwwwwkyyyyRk.qq...
....kRwwQwwkyyyyRk..qq..
....kRwwwwwkgGfFRk...qq.
....kRwwwwwkGgffRk......
....kRRRRRRRRRRRRk......
..kkkkkkkkkkkkkkkkkkkk..
.kawawawawawawawawawawk.
kwawawawawawawawawawawak
kkkkkkkkkkkkkkkkkkkkkkkk
```

## 작가 안경 (2026-10-15)

얼굴을 그대로 두려고 넣지 않았다. 둥근 갈색 테로, 어른 격자의 12번째 줄·5번째 칸부터 칠한다(`BUDDY_PALETTE`의 `q`).

```
.qqq....qqq.
q...qqqq...q
q...q..q...q
.qqq....qqq.
```
