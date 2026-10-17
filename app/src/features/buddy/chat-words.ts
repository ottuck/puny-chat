// One-word messages the buddy answers (docs/PROJECT.md, 채팅으로 돌보기): "밥", "청소" and "일" are care,
// done by the server (server: buddy/CareCommand, keep the lists in step); "춤" and "노래" are only
// on the stage. Only the whole message counts; trailing "!", "~" or "." are fine.

export type ChatWord = 'feed' | 'clean' | 'work' | 'dance' | 'sing';

const WORDS: Record<ChatWord, readonly string[]> = {
  feed: ['밥', '🍚', 'ごはん', 'ご飯', 'food', 'feed'],
  clean: ['청소', '🧹', '똥', '💩', 'そうじ', '掃除', 'うんち', 'clean', 'poop'],
  // A grown-up's work at its station; "청소" is for the poops before that.
  work: ['일', '💼', '仕事', 'しごと', 'work'],
  dance: ['춤', '춤춰', '💃', '🕺', 'おどって', '踊って', 'ダンス', 'dance'],
  sing: ['노래', '노래해', '🎵', '🎶', 'うた', '歌', '歌って', 'sing', 'song'],
};

export function chatWord(text: string): ChatWord | null {
  const word = text
    .trim()
    .replace(/[!~.！。]+$/u, '')
    .trim()
    .toLowerCase();
  for (const [kind, words] of Object.entries(WORDS) as [ChatWord, readonly string[]][]) {
    if (words.includes(word)) return kind;
  }
  return null;
}

// Words anywhere in a message that the buddy feels (docs/fun-improvements.md, 대화 낱말 반응). Only the buddy's
// face changes; nothing is sent. The server counts "laugh" and "love" for the buddy's job
// (server: buddy/MoodWords, keep those two lists in step).
export type Mood = 'love' | 'goodnight' | 'cheer' | 'comfort' | 'laugh' | 'morning';

// In this order: a message with several is felt as the first (love beats a laugh).
const MOODS: readonly (readonly [Mood, readonly string[]])[] = [
  [
    'love',
    [
      '사랑해',
      '좋아해',
      '보고싶',
      '보고 싶',
      '大好き',
      '愛してる',
      '会いたい',
      'love you',
      'miss you',
      '❤',
      '💕',
      '💗',
      '😍',
      '🥰',
    ],
  ],
  ['goodnight', ['잘자', '굿나잇', 'おやすみ', 'good night', 'goodnight', '😴', '🌙']],
  [
    'cheer',
    [
      '화이팅',
      '파이팅',
      '힘내',
      '아자',
      'がんばれ',
      '頑張って',
      'ファイト',
      'fighting',
      'good luck',
      '💪',
    ],
  ],
  [
    'comfort',
    [
      'ㅠㅠ',
      'ㅜㅜ',
      '슬퍼',
      '우울',
      '힘들',
      '悲しい',
      'つらい',
      'しんどい',
      'さみしい',
      '😢',
      '😭',
      '🥺',
    ],
  ],
  ['laugh', ['ㅋㅋ', 'ㅎㅎ', '笑', 'www', 'lol', 'haha', '😂', '🤣']],
  ['morning', ['굿모닝', '좋은 아침', 'おはよう', 'good morning']],
];

export function chatMood(text: string): Mood | null {
  const lower = text.toLowerCase();
  for (const [mood, words] of MOODS) {
    if (words.some((word) => lower.includes(word))) return mood;
  }
  return null;
}
