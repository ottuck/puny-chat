import assert from 'node:assert/strict';
import test from 'node:test';

import { chatMood, chatWord } from '../src/features/buddy/chat-words.ts';

test('a mood word anywhere in a message is felt, in each language', () => {
  assert.equal(chatMood('오늘 진짜 웃겨 ㅋㅋㅋ'), 'laugh');
  assert.equal(chatMood('それは草 笑'), 'laugh');
  assert.equal(chatMood('LOL that is great'), 'laugh');
  assert.equal(chatMood('오늘도 사랑해'), 'love');
  assert.equal(chatMood('会いたいなあ'), 'love');
  assert.equal(chatMood('I miss you'), 'love');
  assert.equal(chatMood('잘자!'), 'goodnight');
  assert.equal(chatMood('おやすみなさい'), 'goodnight');
  assert.equal(chatMood('내일도 화이팅'), 'cheer');
  assert.equal(chatMood('너무 슬퍼 ㅠㅠ'), 'comfort');
  assert.equal(chatMood('굿모닝~'), 'morning');
  assert.equal(chatMood('哈哈哈 好好笑'), 'laugh');
  assert.equal(chatMood('好想你喔'), 'love');
  assert.equal(chatMood('晚安～'), 'goodnight');
  assert.equal(chatMood('明天考試加油'), 'cheer');
  assert.equal(chatMood('今天好難過'), 'comfort');
  assert.equal(chatMood('早安！'), 'morning');
});

test('an ordinary message moves nobody', () => {
  assert.equal(chatMood('오늘 뭐 먹을까?'), null);
  assert.equal(chatMood('see you at six'), null);
  assert.equal(chatMood(''), null);
});

test('with several moods the first of the order wins: love beats a laugh', () => {
  assert.equal(chatMood('ㅋㅋ 보고싶다'), 'love');
  assert.equal(chatMood('잘자 ㅠㅠ'), 'goodnight');
  assert.equal(chatMood('힘내 ㅠㅠ'), 'cheer');
});

test('one-word care and dance messages are still words, not moods of their own', () => {
  assert.equal(chatWord('밥'), 'feed');
  assert.equal(chatMood('밥'), null);
  assert.equal(chatWord('춤!'), 'dance');
  assert.equal(chatWord('飯！'), 'feed');
  assert.equal(chatWord('打掃'), 'clean');
  assert.equal(chatWord('唱歌'), 'sing');
});
