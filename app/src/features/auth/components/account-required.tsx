import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { LinkOutcome } from '@/lib/social-auth';
import { useColors } from '@/theme';

import { social } from '../social';
import { useLinkAccount } from '../use-link-account';
import { AppleButton } from './apple-button';
import { GoogleButton } from './google-button';

// A guest can use everything alone, but talking with someone else needs a linked account: inviting
// a friend or joining one (server: ACCOUNT_REQUIRED, docs/PROJECT.md 계정 연결과 대화 상대). Linking
// keeps the uid, so the buddy and chats stay; `onLinked` then goes on with what was asked.
export function AccountRequired({ onLinked }: { onLinked: (outcome: LinkOutcome) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const { busy, error, link } = useLinkAccount(onLinked);
  const supported = social.google.supported || social.apple.supported;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('accountRequired.title')}</Text>
      <Text lineBreakStrategyIOS="hangul-word" style={[styles.body, { color: colors.textMuted }]}>
        {t('accountRequired.body')}
      </Text>
      {social.google.supported ? (
        <GoogleButton onPress={() => link(social.google)} disabled={busy} />
      ) : null}
      {social.apple.supported ? (
        <AppleButton onPress={() => link(social.apple)} disabled={busy} />
      ) : null}
      {supported ? null : (
        <Text style={[styles.body, { color: colors.textMuted }]}>{t('settings.linkNotReady')}</Text>
      )}
      {busy ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={[styles.body, { color: colors.accent }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
