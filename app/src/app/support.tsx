import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/button';
import { PageTitle } from '@/components/page-title';
import { useAuth } from '@/features/auth/auth-provider';
import { errorMessage } from '@/features/room/error-message';
import { useRoom } from '@/features/room/room-provider';
import {
  REPORT_REASONS,
  removePartner,
  submitInquiry,
  SUPPORT_EMAIL,
  type Receipt,
  type ReportReason,
} from '@/features/support/api';
import { copyText } from '@/lib/clipboard';
import { confirm } from '@/lib/confirm';
import { ApiError } from '@/lib/api';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

type Target = { roomId: string; targetId: string; name: string };

export default function SupportScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, reload } = useRoom();
  const params = useLocalSearchParams<{ type?: string; roomId?: string; targetId?: string }>();
  const [type, setType] = useState<'inquiry' | 'report'>(
    params.type === 'report' ? 'report' : 'inquiry',
  );
  const [savedTarget, setSavedTarget] = useState<Target | null>(null);
  const [locked, setLocked] = useState(false);
  const [reason, setReason] = useState<ReportReason>('HARASSMENT');
  const [description, setDescription] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // A failed request is retried with the same id: deletion and mail notification are not duplicated.
  const requestId = useRef<string | null>(null);
  const sending = useRef(false);
  const frozenDraft = useRef<{
    type: 'inquiry' | 'report';
    description: string;
    replyEmail: string;
    reason: ReportReason;
  } | null>(null);

  const partner =
    state.status === 'ready'
      ? state.room.members.find((member) => member.id !== state.me.id)
      : null;
  const currentTarget =
    state.status === 'ready' &&
    partner &&
    (!params.roomId || params.roomId === state.room.id) &&
    (!params.targetId || params.targetId === partner.id)
      ? {
          roomId: state.room.id,
          targetId: partner.id,
          name: partner.displayName ?? t('chat.guestName'),
        }
      : null;
  const target = savedTarget ?? currentTarget;

  const send = async () => {
    if (!user || sending.current || (type === 'report' && !target)) return;
    sending.current = true;
    setBusy(true);
    try {
      if (type === 'report' && !requestId.current) {
        const ok = await confirm({
          title: t('support.reportAndRemove'),
          message: t('support.reportConfirm', { name: target!.name }),
          confirmLabel: t('support.reportAndRemove'),
          cancelLabel: t('common.cancel'),
          destructive: true,
        });
        if (!ok) return;
      }
      requestId.current ??= randomUUID();
      setLocked(true);
      setSavedTarget(target);
      frozenDraft.current ??= { type, description, replyEmail, reason };
      const draft = frozenDraft.current;
      setError(null);
      const text = draft.description.trim() || t('support.defaultReport');
      const email = draft.replyEmail.trim() || undefined;
      const next =
        draft.type === 'report'
          ? await removePartner({
              requestId: requestId.current,
              roomId: target!.roomId,
              targetId: target!.targetId,
              report: true,
              reason: draft.reason,
              description: text,
              replyEmail: email,
            })
          : await submitInquiry(requestId.current, text, email);
      setReceipt(next);
      if (draft.type === 'report') await reload();
    } catch (e) {
      setError(errorMessage(t, e));
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        requestId.current = null;
        frozenDraft.current = null;
        setLocked(false);
        setSavedTarget(null);
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  const mail = async () => {
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
    } catch {
      setError(t('support.mailUnavailable'));
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <PageTitle title={t('support.title')} />
      <View style={styles.column}>
        <Text style={[styles.intro, { color: colors.textMuted }]}>{t('support.intro')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('support.contact')}</Text>
          <Pressable onPress={mail} accessibilityRole="link" accessibilityLabel={SUPPORT_EMAIL}>
            <Text selectable style={[styles.email, { color: colors.accent }]}>
              {SUPPORT_EMAIL}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              try {
                await copyText(SUPPORT_EMAIL);
                setCopied(true);
              } catch {
                setError(t('support.mailUnavailable'));
              }
            }}
          >
            <Text style={{ color: colors.textMuted }}>
              {t(copied ? 'support.copied' : 'support.copyEmail')}
            </Text>
          </Pressable>
        </View>
        {receipt ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text accessibilityRole="alert" style={[styles.success, { color: colors.text }]}>
              {t('support.received')}
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {t(type === 'report' ? 'support.reportReceived' : 'support.inquiryReceived')}
            </Text>
            <Text selectable style={[styles.body, { color: colors.textMuted }]}>
              {t('support.receipt', { id: receipt.id })}
            </Text>
            <Button label={t('support.done')} onPress={() => router.replace('/')} />
          </View>
        ) : user ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.choices} accessibilityRole="radiogroup">
              {(['inquiry', 'report'] as const).map((option) => (
                <Pressable
                  key={option}
                  disabled={busy || locked}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: type === option }}
                  onPress={() => setType(option)}
                  style={[
                    styles.choice,
                    { backgroundColor: type === option ? colors.accent : colors.background },
                  ]}
                >
                  <Text style={{ color: type === option ? colors.onAccent : colors.text }}>
                    {t(`support.${option}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {type === 'report' ? (
              <>
                <Text style={[styles.body, { color: colors.text }]}>
                  {target ? t('support.target', { name: target.name }) : t('support.noPartner')}
                </Text>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  {t('support.reason')}
                </Text>
                <View style={styles.choices} accessibilityRole="radiogroup">
                  {REPORT_REASONS.map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setReason(value)}
                      disabled={busy || locked}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: reason === value }}
                      style={[
                        styles.choice,
                        { backgroundColor: reason === value ? colors.accent : colors.background },
                      ]}
                    >
                      <Text style={{ color: reason === value ? colors.onAccent : colors.text }}>
                        {t(`support.reasons.${value}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.body, { color: colors.textMuted }]}>
                  {t('support.reportNotice')}
                </Text>
              </>
            ) : null}
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('support.message')}</Text>
            <TextInput
              multiline
              value={description}
              onChangeText={setDescription}
              maxLength={4000}
              editable={!busy && !locked}
              accessibilityLabel={t('support.message')}
              placeholder={t(
                type === 'report' ? 'support.reportPlaceholder' : 'support.inquiryPlaceholder',
              )}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                styles.message,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t('support.replyEmail')}
            </Text>
            <TextInput
              value={replyEmail}
              onChangeText={setReplyEmail}
              maxLength={254}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!busy && !locked}
              accessibilityLabel={t('support.replyEmail')}
              placeholder={t('support.replyPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <Text style={[styles.body, { color: colors.textMuted }]}>
              {t('support.replyNotice')}
            </Text>
            {busy ? <ActivityIndicator color={colors.accent} /> : null}
            <Button
              label={t(
                locked && error
                  ? 'common.retry'
                  : type === 'report'
                    ? 'support.reportAndRemove'
                    : 'support.send',
              )}
              onPress={send}
              disabled={
                busy ||
                (type === 'report' ? !target : !description.trim()) ||
                (!!replyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyEmail.trim()))
              }
            />
          </View>
        ) : (
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {t('support.signedOutHelp')}
          </Text>
        )}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: colors.accent }}>
            {error}
          </Text>
        ) : null}
        <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link">
          <Text style={[styles.footer, { color: colors.textMuted }]}>{t('privacy.title')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', padding: 20, paddingBottom: 40 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 16 },
  intro: { fontSize: 15, lineHeight: 23 },
  card: { padding: 20, borderRadius: 20, gap: 14 },
  label: { fontSize: 13, fontWeight: '600' },
  email: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 22 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 48 },
  message: { minHeight: 140, textAlignVertical: 'top' },
  success: { fontSize: 22, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 13, textDecorationLine: 'underline', padding: 10 },
});
