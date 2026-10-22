import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { GROWN_LEVEL, JOB_CHANGE_LEVELS } from '@/features/buddy/api';
import { rewardAt } from '@/features/buddy/components/stage-decor';
import { giftOfDetail } from '@/features/buddy/gifts';
import { isJob, JOB_ICON } from '@/features/buddy/jobs';

import { photoUrl } from '../photo';
import { foldLevelUps, formatTime, runPosition } from '../timeline';
import {
  isMemberMessage,
  type Member,
  type MemberMessage,
  type Message,
  type MessageReaction,
  type PhotoMessage,
} from '../types';
import { BuddyEventRow, EventCard } from './buddy-event-row';
import { BuddyGiftMessage } from './buddy-gift-message';
import { type BubblePhoto, type BubbleRect, MessageBubble } from './message-bubble';
import { PhotoViewer } from './photo-viewer';
import { ReactionPicker } from './reaction-picker';

// The picked file while mine is on its way (and after, so it does not flash), else the server's.
function photoOf({ photo }: PhotoMessage): BubblePhoto | undefined {
  const uri =
    photo.localUri ?? (photo.roomId && photo.id ? photoUrl(photo.roomId, photo.id) : undefined);
  return uri ? { uri, width: photo.width, height: photo.height } : undefined;
}

type Props = {
  messages: Message[]; // newest first
  myId: string;
  members: Member[];
  buddyName: string;
  // Newest message id the partner has read, if any.
  partnerReadId?: string;
  onRetry: (clientMessageId: string) => void;
  // Long-pressing a text or photo offers the reactions. Without it (the demo) a long press does nothing.
  onReact?: (messageId: string, reaction: MessageReaction | null) => void;
  onLoadOlder: () => void;
  // Lv.20's card offers changing the job while it may be changed (in the buddy's details).
  onChangeJob?: () => void;
  // The top level's card opens the mailbox, where its letter offers going its own way; so does a
  // letter the buddy wrote me.
  onOpenMail?: () => void;
  // A buddy gone its own way: its card opens the memory album.
  onOpenAlbum?: () => void;
};

export function MessageList({
  messages,
  myId,
  members,
  buddyName,
  partnerReadId,
  onRetry,
  onReact,
  onLoadOlder,
  onChangeJob,
  onOpenMail,
  onOpenAlbum,
}: Props) {
  const { t, i18n } = useTranslation();
  const [picking, setPicking] = useState<{ message: MemberMessage; rect: BubbleRect } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const nameOf = (id?: string) =>
    members.find((member) => member.id === id)?.displayName ?? t('chat.guestName');
  // Only my newest read message says so; everything before it is read too.
  const lastRead = partnerReadId
    ? messages.find(
        (m) => isMemberMessage(m) && m.senderId === myId && m.id && m.id <= partnerReadId,
      )
    : undefined;

  const shown = foldLevelUps(messages, GROWN_LEVEL);

  return (
    <>
      {/* Inverted: the newest message sits at the bottom and new ones stay in view. The list's
        "end" is the top, so reaching it loads older history. */}
      <FlatList
        inverted
        data={shown}
        keyExtractor={(message) => message.clientMessageId}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        onEndReached={onLoadOlder}
        onEndReachedThreshold={0.5}
        renderItem={({ item, index }) => {
          if (item.type === 'SYSTEM') {
            return (
              <View style={styles.spaced}>
                <BuddyEventRow
                  label={t(`systemEvent.${item.event}`, {
                    name: item.actorName ?? t('chat.guestName'),
                  })}
                />
              </View>
            );
          }
          if (item.type === 'BUDDY_EVENT' && item.event === 'GROWN') {
            return (
              <View style={styles.spaced}>
                <EventCard
                  title={t('buddyEvent.GROWN', { buddy: buddyName })}
                  body={t('chat.grownBody')}
                  action={onChangeJob ? `🔄 ${t('buddy.jobCard.change')}` : undefined}
                  onAction={onChangeJob}
                />
              </View>
            );
          }
          if (item.type === 'BUDDY_EVENT' && item.event === 'MAX_LEVEL') {
            return (
              <View style={styles.spaced}>
                <EventCard
                  title={t('buddyEvent.MAX_LEVEL', { buddy: buddyName, level: item.level })}
                  body={`${t('chat.maxLevelThanks')} ${t('chat.maxLevelJob')} ${t('chat.maxLevelMail')}`}
                  action={onOpenMail ? `💌 ${t('chat.readLetter')}` : undefined}
                  onAction={onOpenMail}
                />
              </View>
            );
          }
          if (item.type === 'BUDDY_EVENT' && item.event === 'GRADUATED') {
            return (
              <View style={styles.spaced}>
                <EventCard
                  title={t('buddyEvent.GRADUATED', { name: item.detail })}
                  body={t('chat.graduatedBody', { name: item.detail })}
                  action={onOpenAlbum ? `📷 ${t('buddy.album.view')}` : undefined}
                  onAction={onOpenAlbum}
                />
              </View>
            );
          }
          if (item.type === 'BUDDY_EVENT' && item.event === 'JOB' && isJob(item.detail)) {
            return (
              <View style={styles.spaced}>
                <EventCard
                  title={t('buddyEvent.JOB', {
                    icon: JOB_ICON[item.detail],
                    buddy: buddyName,
                    job: t(`buddy.job.${item.detail}`),
                  })}
                  body={`${t(`buddy.jobWhy.${item.detail}`)} ${t('chat.jobChangeRule')}`}
                />
              </View>
            );
          }
          if (item.type === 'BUDDY_EVENT' && item.event === 'JOB_CHANGED' && isJob(item.detail)) {
            return (
              <View style={styles.spaced}>
                <BuddyEventRow
                  label={t('buddyEvent.JOB_CHANGED', {
                    icon: JOB_ICON[item.detail],
                    actor: nameOf(item.actorId),
                    buddy: buddyName,
                    job: t(`buddy.job.${item.detail}`),
                  })}
                />
              </View>
            );
          }
          // What the buddy did for one of us at work (docs/fun-improvements.md, 직업 이벤트): it says so
          // itself, in small bubbles both of us see. A letter is in the mailbox of the one it is for.
          if (item.type === 'BUDDY_EVENT' && item.event === 'GIFT') {
            const gift = giftOfDetail(item.detail);
            return (
              <View style={styles.spaced}>
                {gift ? (
                  <BuddyGiftMessage
                    gift={gift}
                    buddyName={buddyName}
                    toName={nameOf(item.actorId)}
                    onOpenMail={item.actorId === myId ? onOpenMail : undefined}
                  />
                ) : (
                  <BuddyEventRow
                    label={t('buddyEvent.GIFT', { buddy: buddyName, actor: nameOf(item.actorId) })}
                  />
                )}
              </View>
            );
          }
          if (item.type === 'BUDDY_EVENT' && item.event === 'TOGETHER') {
            return (
              <View style={styles.spaced}>
                <EventCard
                  title={t('buddyEvent.TOGETHER', { exp: Number(item.detail) })}
                  body={t('chat.togetherBody', { buddy: buddyName })}
                />
              </View>
            );
          }
          // A level that brings something new to the room says what, and one that lets the job be
          // changed says so.
          if (item.type === 'BUDDY_EVENT' && item.event === 'LEVELED_UP' && item.level) {
            const reward = rewardAt(item.level);
            const line = reward
              ? t('buddyEvent.LEVELED_UP_REWARD', {
                  buddy: buddyName,
                  level: item.level,
                  reward: t(`buddy.reward.${reward}`),
                })
              : t('buddyEvent.LEVELED_UP', { buddy: buddyName, level: item.level });
            return (
              <View style={styles.spaced}>
                <BuddyEventRow
                  label={
                    JOB_CHANGE_LEVELS.includes(item.level)
                      ? `${line} · ${t('chat.jobChangeOpen')}`
                      : line
                  }
                />
              </View>
            );
          }
          if (item.type === 'BUDDY_EVENT') {
            return (
              <View style={styles.spaced}>
                <BuddyEventRow
                  label={t(`buddyEvent.${item.event}`, {
                    buddy: buddyName,
                    actor: nameOf(item.actorId),
                    level: item.level,
                    name: item.detail,
                  })}
                />
              </View>
            );
          }
          const { continuesOlder, showTime } = runPosition(shown, index);
          const photo = item.type === 'PHOTO' ? photoOf(item) : undefined;
          return (
            <View style={continuesOlder ? styles.grouped : styles.spaced}>
              <MessageBubble
                text={item.type === 'TEXT' ? item.text : undefined}
                photo={photo}
                onOpenPhoto={photo ? () => setViewing(photo.uri) : undefined}
                mine={item.senderId === myId}
                time={showTime ? formatTime(item.createdAt, i18n.language) : undefined}
                status={item.status}
                receipt={item === lastRead ? t('chat.read') : undefined}
                onRetry={() => onRetry(item.clientMessageId)}
                reactions={item.reactions}
                myId={myId}
                onReact={
                  onReact && item.id ? (rect) => setPicking({ message: item, rect }) : undefined
                }
                onUnreact={onReact && item.id ? () => onReact(item.id!, null) : undefined}
              />
            </View>
          );
        }}
      />
      <ReactionPicker
        target={picking?.rect ?? null}
        mine={picking?.message.senderId === myId}
        current={picking?.message.reactions?.[myId]}
        onPick={(reaction) => {
          if (picking?.message.id) onReact?.(picking.message.id, reaction);
        }}
        onClose={() => setPicking(null)}
      />
      <PhotoViewer uri={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
  },
  spaced: {
    marginTop: 12,
  },
  grouped: {
    marginTop: 3,
  },
});
