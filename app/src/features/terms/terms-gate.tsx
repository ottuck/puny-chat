import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PageTitle } from '@/components/page-title';
import { acceptTerms, type Me, TERMS_VERSION } from '@/features/room/api';
import { errorMessage } from '@/features/room/error-message';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

import { TermsBody } from './terms-body';

// Everyone agrees to the terms once, by tapping agree, before using the service: a guest right after
// the start flow makes them, an account on its first sign-in, and those from before the terms on
// their next visit (_layout.tsx). Kept on the server, so another device does not ask again.
export function TermsGate({ onAccepted }: { onAccepted: (me: Me) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agree = async () => {
    setBusy(true);
    setError(null);
    try {
      onAccepted(await acceptTerms(TERMS_VERSION));
    } catch (e) {
      setError(errorMessage(t, e));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageTitle title={t('terms.title')} />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.column}>
          <TermsBody />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderColor: colors.border }]}>
        <View style={[styles.column, styles.footerColumn]}>
          {error ? <Text style={[styles.error, { color: colors.accent }]}>{error}</Text> : null}
          <Text
            lineBreakStrategyIOS="hangul-word"
            style={[styles.note, { color: colors.textMuted }]}
          >
            {t('terms.agreeLead')}
          </Text>
          <Button label={t('terms.agree')} onPress={agree} disabled={busy} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { alignItems: 'center', padding: 24 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 18, alignSelf: 'center' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 24, paddingVertical: 12 },
  footerColumn: { gap: 10 },
  note: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  error: { fontSize: 14, textAlign: 'center' },
});
