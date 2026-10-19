import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageTitle } from '@/components/page-title';
import { useAuth } from '@/features/auth/auth-provider';
import { useGuestDaysLeft } from '@/features/auth/guest-expiry';
import { BuddySheet } from '@/features/buddy/components/buddy-sheet';
import { BuddyScene } from '@/features/buddy/components/buddy-scene';
import { StageShade } from '@/features/buddy/components/stage-shade';
import type { Cue } from '@/features/buddy/components/buddy-stage';
import { GuideBanner } from '@/features/buddy/components/guide-banner';
import { changeJob, graduateBuddy } from '@/features/buddy/api';
import { useBuddy } from '@/features/buddy/use-buddy';
import { ChatHeader } from '@/features/chat/components/chat-header';
import { MessageComposer } from '@/features/chat/components/message-composer';
import { EmptyChat } from '@/features/chat/components/empty-chat';
import { nothingSaidYet } from '@/features/chat/timeline';
import { MessageList } from '@/features/chat/components/message-list';
import { useChat } from '@/features/chat/use-chat';
import {
  onNotificationTap,
  type PushState,
  registerForPush,
  setPushEnabled,
} from '@/features/notifications/push';
import { InviteSheet } from '@/features/room/components/invite-sheet';
import type { Me, Room } from '@/features/room/api';
import { useReadyRoom } from '@/features/room/room-provider';
import { notice } from '@/lib/confirm';
import { PartnerSheet } from '@/features/support/components/partner-sheet';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

export default function ChatRoute() {
  const { me, room, reload, refreshRoom } = useReadyRoom();
  const { t } = useTranslation();
  const onRoomLost = (code?: string) => {
    // The partner's code let them in from another app, browser or phone; this one is out.
    if (code === 'SEAT_TAKEN') notice(t('room.seatTakenTitle'), t('room.seatTaken'));
    return reload();
  };
  // Keyed by room: joining another room starts over with a new connection and timeline.
  return (
    <ChatScreen
      key={room.id}
      me={me}
      room={room}
      onRoomLost={onRoomLost}
      onRoomChanged={refreshRoom}
    />
  );
}

type ChatScreenProps = {
  me: Me;
  room: Room;
  onRoomLost: () => void;
  // Members joined or left, or the album grew: fetch the room again.
  onRoomChanged: () => void;
};

function ChatScreen({ me, room, onRoomLost, onRoomChanged }: ChatScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const care = useBuddy(room.buddy);
  const { buddy, busy, setBuddy, work, bathe } = care;
  const chat = useChat({ myId: me.id, onRoomLost, onRoomChanged, onBuddy: setBuddy });
  // The bowl and the poops answer the tap at once (use-buddy.ts), and so does the buddy.
  const feed = () => {
    if (care.feed()) chat.playMine('fed');
  };
  const clean = () => {
    if (care.clean()) chat.playMine('cleaned');
  };
  // What the buddy is asked to do: a word in the chat, or work from its details.
  const [cue, setCue] = useState<Cue | null>(null);
  const [chatCue, setChatCue] = useState(chat.cue);
  if (chat.cue !== chatCue) {
    setChatCue(chat.cue);
    setCue(chat.cue);
  }
  const { messages, status, online, typing, reads, unreadWhileAway } = chat;
  const [buddyOpen, setBuddyOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const { account } = useAuth();
  const guestDaysLeft = useGuestDaysLeft(account);

  // Asked here rather than at launch: by now the user knows what the app is for.
  const [push, setPush] = useState<PushState | null>(null);
  useEffect(() => {
    registerForPush()
      .then(setPush)
      .catch((e) => console.warn('push registration failed', e));
  }, []);
  // Every notification is about this room (a message, the guest's days), so a tap brings the chat
  // back from wherever the app was left (settings, the guide). This screen stays under those.
  useEffect(() => onNotificationTap(() => router.navigate('/')), []);
  const [inviteOpen, setInviteOpen] = useState(false);
  // The guide waits for the dream before the first egg to end.
  const [dreaming, setDreaming] = useState(false);
  // The chat's card for a buddy gone its own way opens the album on the stage.
  const [albumRequest, setAlbumRequest] = useState<string | null>(null);
  const partner = room.members.find((member) => member.id !== me.id);

  // The buddy's stage takes about a third of the screen and keeps it (docs/PROJECT.md, 핵심 경험).
  const { height: windowHeight } = useWindowDimensions();
  const stageHeight = Math.round(Math.min(280, Math.max(180, windowHeight * 0.3)));

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Web has no push notifications: a hidden tab counts new messages in its title instead. */}
      <PageTitle count={unreadWhileAway} />
      {/*
        The composer already pads for the home indicator, so the keyboard offset subtracts it.
        Expo Go has no react-native-keyboard-controller; switch to it once we use dev builds.
      */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={-insets.bottom}
        style={styles.column}
      >
        <ChatHeader
          partnerName={partner ? (partner.displayName ?? '') : null}
          partnerOnline={partner ? online.includes(partner.id) : false}
          partnerTyping={partner ? typing.includes(partner.id) : false}
          connected={status === 'online'}
          onPressInvite={() => setInviteOpen(true)}
          onPressSettings={() => router.push('/settings')}
          onPressHelp={() => router.push('/guide')}
          onPressPartner={partner ? () => setPartnerOpen(true) : undefined}
        />
        <GuideBanner roomId={room.id} hold={dreaming} onOpen={() => router.push('/guide')} />
        <BuddyScene
          dreams
          albumRequest={albumRequest}
          // Being a guest and notifications off come as letters in the stage's mailbox.
          situation={{ guestDaysLeft, push }}
          onTurnOnPush={() =>
            setPushEnabled(true).then((next) => {
              setPush(next);
              return next;
            })
          }
          onDreaming={setDreaming}
          buddy={buddy}
          busy={busy}
          height={stageHeight}
          onFeed={feed}
          onClean={clean}
          onWork={work}
          onBathe={bathe}
          onOpenDetail={() => setBuddyOpen(true)}
          reaction={chat.reaction}
          cue={cue}
          lastTalkAt={chat.lastTalkAt}
          partnerPet={chat.partnerPet}
          onPet={chat.notifyPet}
          partnerHere={status === 'online' && !!partner && online.includes(partner.id)}
          album={room.album}
        />
        <StageShade />
        <View style={styles.list}>
          {chat.loaded && nothingSaidYet(messages) ? (
            <EmptyChat
              buddyName={buddy.name}
              partnerName={partner ? (partner.displayName ?? '') : null}
            />
          ) : (
            <MessageList
              messages={messages}
              myId={me.id}
              members={room.members}
              buddyName={buddy.name}
              partnerReadId={partner ? reads[partner.id] : undefined}
              onRetry={chat.retry}
              onLoadOlder={chat.loadOlder}
              onGraduate={buddy.grown ? () => setBuddyOpen(true) : undefined}
              onOpenAlbum={() => setAlbumRequest(String(Date.now()))}
            />
          )}
        </View>
        <MessageComposer
          userId={me.id}
          roomId={room.id}
          onSend={chat.send}
          onTyping={chat.notifyTyping}
        />
      </KeyboardAvoidingView>

      <BuddySheet
        visible={buddyOpen}
        buddy={buddy}
        onClose={() => setBuddyOpen(false)}
        together={
          partner
            ? { myId: me.id, partnerId: partner.id, partnerName: partner.displayName ?? '' }
            : undefined
        }
        onChangeJob={async (job) => {
          setBuddy(await changeJob(job));
        }}
        onGraduate={async (newName) => {
          setBuddy(await graduateBuddy(newName));
          setBuddyOpen(false);
          onRoomChanged();
        }}
      />
      <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} />
      {partner ? (
        <PartnerSheet
          visible={partnerOpen}
          onClose={() => setPartnerOpen(false)}
          roomId={room.id}
          targetId={partner.id}
          partnerName={partner.displayName ?? ''}
          buddyName={buddy.name}
          onRemoved={async () => {
            await onRoomLost();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  list: {
    flex: 1,
  },
});
