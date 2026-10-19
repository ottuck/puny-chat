import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { PageTitle } from '@/components/page-title';
import {
  deleteAccount,
  noteAccountLinked,
  prepareAccountSwitch,
  signOut,
} from '@/features/auth/actions';
import { ChevronRightIcon } from '@/components/icons';
import { useAuth } from '@/features/auth/auth-provider';
import { useGuestDaysLeft } from '@/features/auth/guest-expiry';
import { currentGuestPlace } from '@/features/auth/guest-place';
import { isInAppBrowser } from '@/features/auth/guest-place-ua';
import { AppleButton } from '@/features/auth/components/apple-button';
import { social } from '@/features/auth/social';
import {
  registerForPush,
  type PushState,
  pushSupported,
  setPushEnabled,
} from '@/features/notifications/push';
import { DisplayCard } from '@/features/preferences/components/display-card';
import type { Room } from '@/features/room/api';
import {
  isCancelledSignIn,
  linkOrSwitch,
  onPopupClosed,
  type ProviderId,
  type SocialProvider,
} from '@/lib/social-auth';
import { useRoom } from '@/features/room/room-provider';
import { confirm } from '@/lib/confirm';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

// Who you are, your account, notifications, the room, and leaving, signing out or deleting the
// account (docs/PROJECT.md, MVP 범위).
export default function SettingsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { account } = useAuth();
  const { state } = useRoom();
  const me = state.status === 'ready' || state.status === 'none' ? state.me : null;
  const guest = !!account?.guest;
  const daysLeft = useGuestDaysLeft(account);
  const alone = state.status === 'ready' && state.room.members.length < 2;
  const showMove = guest && state.status === 'ready';
  const showJoin = !!me?.displayName;

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Deleting a linked account signs in again in a popup first; closing it lets go quickly.
  useEffect(() => (deleting ? onPopupClosed(() => setDeleting(false)) : undefined), [deleting]);

  // A guest who signs out can never come back to this account; say so first.
  const onSignOut = async () => {
    if (guest) {
      const ok = await confirm({
        title: t('settings.guestSignOutTitle'),
        message: t('settings.guestSignOutMessage'),
        confirmLabel: t('settings.signOut'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;
    }
    await signOut();
  };

  const onDelete = async () => {
    const room = state.status === 'ready' ? state.room : null;
    const partner = room?.members.find((member) => member.id !== me?.id);
    const ok = await confirm({
      title: t('settings.deleteTitle'),
      message: !room
        ? t('settings.deleteNoRoom')
        : partner
          ? t('settings.deleteDuo', {
              buddy: room.buddy.name,
              partner: partner.displayName ?? t('chat.guestName'),
            })
          : t('settings.deleteSolo', { buddy: room.buddy.name }),
      confirmLabel: t('settings.deleteConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // Signed out at the end: the route guards move on to the sign-in screen.
      await deleteAccount();
    } catch (e) {
      if (!isCancelledSignIn(e)) {
        console.warn(e);
        setDeleteError(t('settings.deleteFailed'));
      }
      setDeleting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <PageTitle title={t('settings.title')} />
      <View style={styles.column}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('settings.profile')}</Text>
          <Text style={[styles.name, { color: colors.text }]}>{me?.displayName ?? ''}</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/name', params: { edit: '1' } })}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.linkLabel, { color: colors.accent }]}>
              {t('settings.changeName')}
            </Text>
          </Pressable>
        </View>

        <AccountCard
          provider={account?.provider ?? null}
          daysLeft={daysLeft}
          email={account?.email ?? null}
        />

        <DisplayCard />

        {pushSupported ? <NotificationsCard /> : null}

        {state.status === 'ready' ? <RoomCard room={state.room} myId={state.me.id} /> : null}

        {/* Everything here opens a screen with a back button, as rows with a chevron. */}
        {showMove || showJoin ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* A guest lives only in this app or browser: a code to open their room elsewhere (an
                account just signs in there). */}
            {showMove ? (
              <NavRow label={t('invite.moveTitle')} onPress={() => router.push('/move')} />
            ) : null}
            {showJoin ? (
              // Alone, a friend's code is the likely next step: it stands out.
              <NavRow
                label={t('settings.joinWithCode')}
                onPress={() => router.push('/join')}
                accent={alone}
              />
            ) : null}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {t('support.serviceInfo')}
          </Text>
          <NavRow label={t('support.title')} onPress={() => router.push('/support')} />
          <NavRow label={t('privacy.title')} onPress={() => router.push('/privacy')} />
        </View>

        <Pressable
          onPress={onSignOut}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.signOut, { color: colors.accent }]}>{t('settings.signOut')}</Text>
        </Pressable>

        {/* Quiet, at the very end: needed, but not something to press by accident. */}
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.delete, { opacity: pressed || deleting ? 0.6 : 1 }]}
        >
          {deleting ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Text style={[styles.deleteLabel, { color: colors.textMuted }]}>
              {t('settings.deleteAccount')}
            </Text>
          )}
        </Pressable>
        {deleteError ? (
          <Text style={[styles.email, styles.centered, { color: colors.accent }]}>
            {deleteError}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

// Guests can keep everything by linking an account: the Firebase uid stays the same, so nothing
// moves on the server. Offered here rather than at the start, once there is something to keep.
function AccountCard({
  provider,
  daysLeft,
  email,
}: {
  provider: ProviderId | null;
  daysLeft: number | null;
  email: string | null;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Where this guest lives, so they know where to open puny-chat to find it again.
  const [place] = useState(currentGuestPlace);
  // A closed popup takes Firebase 8 seconds to report; the buttons come back as soon as it closes.
  useEffect(() => (busy ? onPopupClosed(() => setBusy(false)) : undefined), [busy]);

  const link = async (provider: SocialProvider) => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await linkOrSwitch(provider, {
        confirmSwitch: () =>
          confirm({
            title: t('settings.accountInUseTitle'),
            message: t('settings.accountInUseMessage'),
            confirmLabel: t('settings.accountInUseConfirm'),
            cancelLabel: t('common.cancel'),
            destructive: true,
          }),
        beforeSwitch: prepareAccountSwitch,
      });
      if (outcome === 'linked') await noteAccountLinked();
    } catch (e) {
      console.warn(e);
      setError(t('settings.linkFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{t('settings.account')}</Text>
      {provider === null ? (
        <>
          <Text style={[styles.name, { color: colors.text }]}>
            {t('settings.guestTitle')}
            {daysLeft !== null ? ` · ${t('guest.daysLeft', { count: daysLeft })}` : ''}
          </Text>
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.email, { color: colors.textMuted }]}
          >
            {t('settings.guestBody')}
          </Text>
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.email, styles.section, { color: colors.textMuted }]}
          >
            {t('settings.guestPlace', { place: t(`settings.places.${place}`) })}
            {isInAppBrowser(place) ? ` ${t('settings.guestPlaceInApp')}` : ''}
          </Text>
          {social.google.supported ? (
            <Pressable
              onPress={() => link(social.google)}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.leave, { opacity: pressed || busy ? 0.6 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={[styles.signOut, { color: colors.accent }]}>
                  {t('settings.linkGoogle')}
                </Text>
              )}
            </Pressable>
          ) : null}
          {social.apple.supported ? (
            <View style={styles.section}>
              <AppleButton onPress={() => link(social.apple)} disabled={busy} />
            </View>
          ) : null}
          {social.google.supported || social.apple.supported ? null : (
            <Text style={[styles.email, styles.section, { color: colors.textMuted }]}>
              {t('settings.linkNotReady')}
            </Text>
          )}
          {error ? <Text style={[styles.email, { color: colors.accent }]}>{error}</Text> : null}
        </>
      ) : (
        <>
          <Text style={[styles.name, { color: colors.text }]}>
            {t(provider === 'apple' ? 'settings.linkedApple' : 'settings.linkedGoogle')}
          </Text>
          {email ? <Text style={[styles.email, { color: colors.textMuted }]}>{email}</Text> : null}
        </>
      )}
    </View>
  );
}

// New-message notifications for this device. Turning them off removes the device from the
// server, and a "no" to the system prompt can only be undone in the Settings app.
function NotificationsCard() {
  const colors = useColors();
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | null>(null);
  // Where it cannot be turned on (Safari before the home screen), the switch still answers a tap:
  // it moves, goes back, and then says how.
  const [bouncing, setBouncing] = useState(false);
  const [hint, setHint] = useState(false);
  const blocked = state === 'unavailable' || state === 'needsInstall';

  useEffect(() => {
    if (!bouncing) return;
    const timer = setTimeout(() => {
      setBouncing(false);
      setHint(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [bouncing]);

  useEffect(() => {
    let cancelled = false;
    // Where things stand; asking for permission waits for the switch.
    registerForPush()
      .then((next) => !cancelled && setState(next))
      .catch((e) => {
        console.warn(e);
        if (!cancelled) setState('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (enabled: boolean) => {
    if (blocked) {
      if (enabled) setBouncing(true);
      return;
    }
    setState(enabled ? 'on' : 'off');
    setPushEnabled(enabled)
      .then(setState)
      .catch((e) => {
        console.warn(e);
        setState('unavailable');
      });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={[styles.row, { color: colors.text }]}>{t('settings.notifications')}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>
            {t('settings.notificationsBody')}
          </Text>
        </View>
        <Switch
          value={state === 'on' || bouncing}
          onValueChange={toggle}
          disabled={state === null}
          trackColor={{ false: colors.switchTrack, true: colors.accent }}
          ios_backgroundColor={colors.switchTrack}
          thumbColor={Platform.OS === 'ios' ? undefined : colors.onAccent}
          accessibilityLabel={t('settings.notifications')}
        />
      </View>
      {state === 'denied' && Platform.OS === 'web' ? (
        <Text style={[styles.email, styles.section, { color: colors.textMuted }]}>
          {t('settings.notificationsDeniedWeb')}
        </Text>
      ) : state === 'denied' ? (
        <>
          <Text style={[styles.email, styles.section, { color: colors.textMuted }]}>
            {t('settings.notificationsDenied')}
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.linkLabel, { color: colors.accent }]}>
              {t('settings.openSettings')}
            </Text>
          </Pressable>
        </>
      ) : state === 'needsInstall' && hint ? (
        <Text
          lineBreakStrategyIOS="hangul-word"
          style={[styles.email, styles.section, { color: colors.textMuted }]}
        >
          {t('settings.notificationsInstall')}
        </Text>
      ) : state === 'unavailable' && hint ? (
        <Text style={[styles.email, styles.section, { color: colors.textMuted }]}>
          {t('settings.notificationsUnavailable')}
        </Text>
      ) : null}
    </View>
  );
}

// A row that opens another screen.
function NavRow({
  label,
  onPress,
  accent = false,
}: {
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text
        style={[
          styles.row,
          styles.navLabel,
          { color: accent ? colors.accent : colors.text },
          accent && styles.accentLabel,
        ]}
      >
        {label}
      </Text>
      <ChevronRightIcon color={accent ? colors.accent : colors.textMuted} />
    </Pressable>
  );
}

// The room, as the one looking sees it: the buddy and who they share it with (not themselves).
function RoomCard({ room, myId }: { room: Room; myId: string }) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const partner = room.members.find((member) => member.id !== myId);
  const since = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
    new Date(room.createdAt),
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{t('settings.room')}</Text>
      <Text style={[styles.email, { color: colors.textMuted }]}>
        {t('settings.since', { date: since })}
      </Text>
      <Text style={[styles.label, styles.section, { color: colors.textMuted }]}>
        {t('settings.buddy')}
      </Text>
      <Text style={[styles.name, { color: colors.text }]}>{room.buddy.name}</Text>
      <Text style={[styles.label, styles.section, { color: colors.textMuted }]}>
        {t('settings.members')}
      </Text>
      {partner ? (
        <Text style={[styles.name, { color: colors.text }]}>
          {partner.displayName ?? t('chat.guestName')}
        </Text>
      ) : (
        <Text style={[styles.email, { color: colors.textMuted }]}>{t('settings.alone')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginTop: 12,
  },
  navRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLabel: {
    flex: 1,
  },
  accentLabel: {
    fontWeight: '600',
  },
  leave: {
    marginTop: 16,
    minHeight: 24,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 16,
  },
  column: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  label: {
    fontSize: 13,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
  },
  row: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  delete: {
    alignSelf: 'center',
    minHeight: 24,
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  centered: {
    textAlign: 'center',
  },
  signOut: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
