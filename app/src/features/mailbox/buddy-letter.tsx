import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { dressedFrame } from '@/features/buddy/pixel/looks';
import { type Frame, PixelSprite } from '@/features/buddy/pixel/pixel-sprite';
import { BUDDY_PALETTE } from '@/features/buddy/pixel/sprites';

// A letter the buddy wrote at work (docs/fun-improvements.md, 직업 선물), on stationery like a letter
// one would buy: cream paper inside a soft dotted frame, a little sprig of flowers in two corners, faint
// rules with every line of text on one, "To." at the top and "From." with its face at the bottom.

const LINE = 28;
const FACE = 24;
const PAPER = '#FFF9EE';
const EDGE = '#EBDCC6';
const FRAME = '#E9AFA2';
const INK = '#5A4636';
const PENCIL = '#A39484';
const RULE = '#F0E4D2';

const CORNER_PALETTE = { p: '#F2A7B6', y: '#F6C945', w: '#FFFFFF', g: '#7DB86A', G: '#4E8A44' };
// prettier-ignore
const CORNER: Frame = [
  '....pp......',
  '...pyyp..ww.',
  '....pp..wyyw',
  '..g..g...ww.',
  '...g.g..g...',
  '.gg.gg.g....',
  '..ggGgg.....',
  '.....G......',
];

export function BuddyLetterPaper({
  date,
  to,
  body,
  from,
}: {
  date: string;
  to: string;
  body: string;
  from: string;
}) {
  const [height, setHeight] = useState(0);
  const face = dressedFrame('ADULT', 'happy', 'WRITER', null);
  return (
    <View style={styles.paper}>
      <View style={styles.frame} />
      <View style={[styles.corner, styles.cornerTop]}>
        <PixelSprite frame={CORNER} palette={CORNER_PALETTE} scale={3} />
      </View>
      <View style={[styles.corner, styles.cornerBottom]}>
        <PixelSprite frame={CORNER} palette={CORNER_PALETTE} scale={3} flipped />
      </View>
      <View style={styles.lines}>
        {Array.from({ length: Math.ceil(height / LINE) }, (_, i) => (
          <View key={i} style={[styles.rule, { top: (i + 1) * LINE - 2 }]} />
        ))}
        <View onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
          <Text style={styles.to}>{to}</Text>
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
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    marginTop: 16,
    backgroundColor: PAPER,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: EDGE,
    paddingHorizontal: 30,
    paddingTop: 34,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  // A soft dotted frame inside the edge.
  frame: {
    position: 'absolute',
    top: 9,
    left: 9,
    right: 9,
    bottom: 9,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: FRAME,
    borderRadius: 4,
  },
  corner: {
    position: 'absolute',
  },
  cornerTop: {
    top: 14,
    left: 14,
  },
  cornerBottom: {
    bottom: 14,
    right: 14,
  },
  lines: {
    paddingTop: 4,
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: RULE,
  },
  to: {
    fontSize: 16,
    lineHeight: LINE,
    fontWeight: '700',
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
    fontWeight: '700',
    color: INK,
  },
  date: {
    alignSelf: 'flex-end',
    fontSize: 12,
    lineHeight: LINE,
    color: PENCIL,
  },
});
