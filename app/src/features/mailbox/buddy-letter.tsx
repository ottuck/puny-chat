import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { dressedFrame } from '@/features/buddy/pixel/looks';
import { PixelSprite } from '@/features/buddy/pixel/pixel-sprite';
import { BUDDY_PALETTE } from '@/features/buddy/pixel/sprites';

// A letter the buddy wrote at work (docs/fun-improvements.md, 직업 선물). Not the printed sheet our
// own letters and news come on, but a page from a notebook: a little crooked, taped down, ruled in
// pale blue with a red margin, written in ink, signed with its face. Every line of text sits on a rule.

const LINE = 28;
const TOP = 10;
const FACE = 24;
const PAGE = '#FFFEF7';
const INK = '#2F4A7C';
const PENCIL = '#9A8F86';
const RULE = '#DCE6F0';
const MARGIN = '#F0B4AC';
const TAPE = 'rgba(244, 210, 116, 0.72)';

export function BuddyLetterPaper({
  date,
  title,
  body,
  from,
}: {
  date: string;
  title: string;
  body: string;
  from: string;
}) {
  const [height, setHeight] = useState(0);
  const face = dressedFrame('ADULT', 'happy', 'WRITER', null);
  return (
    <View style={styles.wrap}>
      <View style={styles.page}>
        <View style={styles.margin} />
        {Array.from({ length: Math.ceil(height / LINE) }, (_, i) => (
          <View key={i} style={[styles.rule, { top: TOP + (i + 1) * LINE - 2 }]} />
        ))}
        <View style={styles.text} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.sign}>
            <Text style={styles.from}>{from}</Text>
            <PixelSprite
              frame={face}
              palette={BUDDY_PALETTE}
              scale={FACE / face[0].length}
              smooth
            />
          </View>
        </View>
      </View>
      <View style={styles.tape} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 26,
    marginHorizontal: 4,
  },
  page: {
    backgroundColor: PAGE,
    borderRadius: 2,
    paddingLeft: 42,
    paddingRight: 18,
    paddingBottom: LINE / 2,
    transform: [{ rotate: '-1deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 3 },
    elevation: 3,
    overflow: 'hidden',
  },
  margin: {
    position: 'absolute',
    left: 30,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: MARGIN,
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: RULE,
  },
  text: {
    paddingTop: TOP,
  },
  date: {
    alignSelf: 'flex-end',
    fontSize: 12,
    lineHeight: LINE,
    color: PENCIL,
  },
  title: {
    fontSize: 16,
    lineHeight: LINE,
    fontWeight: '600',
    color: INK,
  },
  body: {
    fontSize: 15,
    lineHeight: LINE,
    color: INK,
  },
  sign: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    height: LINE * 2,
  },
  from: {
    fontSize: 15,
    lineHeight: LINE,
    color: INK,
  },
  // A strip of masking tape over the top edge.
  tape: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    width: 88,
    height: 24,
    backgroundColor: TAPE,
    transform: [{ rotate: '3deg' }],
  },
});
