import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PageTitle } from '@/components/page-title';
import { Button } from '@/components/button';
import { acceptInvitation } from '@/features/room/api';
import { errorMessage } from '@/features/room/error-message';
import { useRoom } from '@/features/room/room-provider';
import { ApiError } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

const CODE_LENGTH = 4;

// Chat apps often copy only a whole bubble: a pasted invite message gives up the code in its link.
function codeFrom(text: string) {
  const fromLink = /code=([A-Za-z0-9]+)/.exec(text)?.[1] ?? text;
  return fromLink
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

// Join a friend's room with their invite code. Someone who already has a solo room is asked to
// confirm first: that room and its buddy go away (docs/PROJECT.md, Room·초대 규칙).
export default function JoinScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { setRoom } = useRoom();
  // From an invite link (join?code=…), if that is how they came.
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => codeFrom(params.code ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      // Up to two questions, each asked once: coming in as the one a code is for (their seat), and
      // leaving the room this person has now.
      let leave = false;
      let takeSeat = false;
      let room;
      while (!room) {
        try {
          room = await acceptInvitation(code, leave, takeSeat);
        } catch (e) {
          if (!(e instanceof ApiError)) throw e;
          let ok;
          if (e.code === 'SEAT_CONFIRMATION_REQUIRED' && !takeSeat) {
            const name = e.detail || t('chat.guestName');
            ok = await confirm({
              title: t('join.seatTitle', { name }),
              message: t('join.seatMessage', { name }),
              confirmLabel: t('join.seatConfirm'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            takeSeat = true;
          } else if (e.code === 'LEAVE_CONFIRMATION_REQUIRED' && !leave) {
            ok = await confirm({
              title: t('join.leaveTitle'),
              message: t('join.leaveMessage'),
              confirmLabel: t('join.leaveConfirm'),
              cancelLabel: t('common.cancel'),
              destructive: true,
            });
            leave = true;
          } else {
            throw e;
          }
          if (!ok) {
            setBusy(false);
            return;
          }
        }
      }
      setRoom(room);
      router.dismissTo('/');
    } catch (e) {
      setError(errorMessage(t, e));
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageTitle title={t('join.title')} />
      <View style={styles.column}>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{t('join.hint')}</Text>
        <TextInput
          value={code}
          onChangeText={(value) => setCode(codeFrom(value))}
          placeholder="AB23"
          placeholderTextColor={colors.border}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="join"
          onSubmitEditing={() => code.length === CODE_LENGTH && join()}
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        />
        {error ? <Text style={[styles.error, { color: colors.accent }]}>{error}</Text> : null}
        <Button
          label={t('join.submit')}
          onPress={join}
          disabled={busy || code.length !== CODE_LENGTH}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    padding: 24,
    gap: 16,
  },
  hint: {
    fontSize: 15,
    textAlign: 'center',
  },
  input: {
    height: 60,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
});
