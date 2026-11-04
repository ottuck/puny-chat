import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { SUPPORT_EMAIL } from '@/features/support/api';
import { useColors } from '@/theme';

const SECTIONS = [
  'service',
  'accounts',
  'conduct',
  'safety',
  'content',
  'ending',
  'changes',
  'contact',
] as const;

// The terms of use (EULA) in the app's language: the page (app/terms.tsx) and the screen everyone
// agrees to once (terms-gate.tsx). Zero tolerance for objectionable content and abusive users is
// App Review Guideline 1.2.
export function TermsBody() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{t('terms.title')}</Text>
      <Text style={[styles.date, { color: colors.textMuted }]}>{t('terms.effective')}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{t('terms.intro')}</Text>
      {SECTIONS.map((section) => (
        <View key={section} style={styles.section}>
          <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
            {t(`terms.sections.${section}.title`)}
          </Text>
          <Text selectable style={[styles.body, { color: colors.textMuted }]}>
            {t(`terms.sections.${section}.body`, { email: SUPPORT_EMAIL })}
          </Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700' },
  date: { fontSize: 13 },
  section: { gap: 8 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 25 },
});
