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

## 작가 둥근 안경 (2026-10-15)

작가는 위 반테 안경(검은 윗테·금색 아래 테)을 쓰기로 했다. 이건 그 전의 둥근 갈색 테 안경으로, 어른 격자의 12번째 줄·5번째 칸부터 칠한다(`BUDDY_PALETTE`의 `q`).

```
.qqq....qqq.
q...qqqq...q
q...q..q...q
.qqq....qqq.
```

## 수건 같은 요리사 모자 (2026-10-15)

꽃 둘레에 두른 낮은 흰 모자. 요리사 모자로는 목욕할 때 머리에 두른 수건처럼 보여서 바꿨다. **나중에 목욕 이벤트에 쓴다.**
어른 격자 5번째 줄부터 칠한다(`BUDDY_PALETTE`: `w` 흰색, `x` #DCE1E7 그늘. `.` = 그대로).

```
....kwww......wwwk....
...kwwwwwwwwwwwwwwk...
...kwwxwwwxwwwxwwwk...
....kxxxxxxxxxxxxk....
```

## 바리스타 앞치마 (2026-10-15)

둥근 몸에 두르는 것은 어색해서 두건으로 바꿨다. 어른 격자 16번째 줄부터(`c` #4E9A73, `C` #3A7457, `E` #74BE94 단,
`q` #8A5A3B 주머니, `J` #C99A68 주머니 밝은 면). 포즈가 입을 벌리면 입이 앞에 오게 칠했다.

```
.......kEEEEEEk.......
.....kkCccccccCkk.....
....kCCccccckJJkCC....
.....CCccccckqqkCCk...
.......CCCCCCkkC.k....
```

## 동그란 직업 배지 (2026-10-15)

무대 오른쪽 위 직업 표시를 직업 색 동전에 흰 표시로 바꿔 봤지만 옛 소품 그림이 더 알아보기 쉬워서 되돌렸다. 16×16,
`PROP_PALETTE`에 `T` #9E4A68, `U` #6A2C43(작가)을 더해야 한다.

CHEF:

```
................
....kkkkkkkk....
...kkllllllkk...
..klluuuuuuuuk..
.kkluwwuuwwuukk.
.kluuwwwwwwuudk.
.kluwwwwwwwwudk.
.kluwwwwwwwwudk.
.kluuwwwwwwuudk.
.kluuvvvvvvuudk.
.kluuwwwwwwuudk.
.kkuuuuuuuuudkk.
..kuuuuuuuuddk..
...kkddddddkk...
....kkkkkkkk....
................
```

GARDENER:

```
................
....kkkkkkkk....
...kkPPPPPPkk...
..kPPggggggggk..
.kkPgggggggggkk.
.kPgwwggggwwgGk.
.kPgwwwggwwwgGk.
.kPggwwwwwwggGk.
.kPggggwwggggGk.
.kPggggwwggggGk.
.kPggggwwggggGk.
.kkgggggggggGkk.
..kggggggggGGk..
...kkGGGGGGkk...
....kkkkkkkk....
................
```

DJ:

```
................
....kkkkkkkk....
...kkaaaaaakk...
..kaaBBBBBBBBk..
.kkaBBwwwwBBBkk.
.kaBBwBBBBwBBNk.
.kaBwBBBBBBwBNk.
.kaBwBBBBBBwBNk.
.kaBwwBBBBwwBNk.
.kaBwwBBBBwwBNk.
.kaBwwBBBBwwBNk.
.kkBBBBBBBBBNkk.
..kBBBBBBBBNNk..
...kkNNNNNNkk...
....kkkkkkkk....
................
```

WRITER:

```
................
....kkkkkkkk....
...kkMMMMMMkk...
..kMMTTTTTTTTk..
.kkMTTTTTTwwTkk.
.kMTTTTTTwwwTUk.
.kMTTTTTwwwTTUk.
.kMTTTTwwwTTTUk.
.kMTTTwwwTTTTUk.
.kMTTTwwTTTTTUk.
.kMTTwTTTTTTTUk.
.kkTwTTTTTTTUkk.
..kTTTTTTTTUUk..
...kkUUUUUUkk...
....kkkkkkkk....
................
```

BARISTA:

```
................
....kkkkkkkk....
...kkLLLLLLkk...
..kLLDDDDDDDDk..
.kkLDDwDwDDDDkk.
.kLDDwDwDDDDDRk.
.kLDDDDDDDDDDRk.
.kLDwwwwwwwDDRk.
.kLDwwwwwwDwDRk.
.kLDwwwwwwwDDRk.
.kLDDwwwwwDDDRk.
.kkDDDDDDDDDRkk.
..kDDDDDDDDRRk..
...kkRRRRRRkk...
....kkkkkkkk....
................
```
