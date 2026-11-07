import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BuddyJob } from '../../api';
import type { Reaction } from '../../reactions';
import { TOP_NOTE_MS } from '../top-level';

// Reaching the top level (top-level.tsx): once for each such reaction, over after the notes.
export function useTopLevel(
  reaction: Reaction | null,
  job: BuddyJob | null,
  onOpenMail?: () => void,
) {
  const { t } = useTranslation();
  const [topId, setTopId] = useState<string | null>(null);
  const [topDone, setTopDone] = useState<string | null>(null);
  if (reaction?.kind === 'maxLevel' && reaction.id !== topId) setTopId(reaction.id);
  const topOn = topId !== null && topDone !== topId;
  const topNotes = [
    { text: t('buddy.top.reached') },
    { text: t('buddy.top.letter'), onPress: onOpenMail },
    ...(job ? [{ text: t('buddy.notice.jobChangeFree') }] : []),
  ];
  const topMs = topNotes.length * TOP_NOTE_MS;
  useEffect(() => {
    if (!topOn) return;
    const timer = setTimeout(() => setTopDone(topId), topMs);
    return () => clearTimeout(timer);
  }, [topOn, topId, topMs]);
  return { topOn, topId, topNotes, topMs };
}
