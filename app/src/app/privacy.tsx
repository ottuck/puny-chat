import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PageTitle } from '@/components/page-title';
import { SUPPORT_EMAIL } from '@/features/support/api';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

const SECTIONS = [
  'operator',
  'collection',
  'purposes',
  'sharing',
  'providers',
  'retention',
  'security',
  'rights',
  'children',
  'changes',
] as const;

// In the app's language (settings, or the device's); the page has no language switch of its own.
export default function PrivacyScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <PageTitle title={t('privacy.title')} />
      <View style={styles.column}>
        <Text style={[styles.title, { color: colors.text }]}>{t('privacy.title')}</Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>{t('privacy.effective')}</Text>
        <Text style={[styles.body, { color: colors.text }]}>{t('privacy.intro')}</Text>
        {SECTIONS.map((section) => (
          <View key={section} style={styles.section}>
            <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
              {t(`privacy.sections.${section}.title`)}
            </Text>
            <Text selectable style={[styles.body, { color: colors.textMuted }]}>
              {t(`privacy.sections.${section}.body`, { email: SUPPORT_EMAIL })}
            </Text>
          </View>
        ))}
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        >
          <Text selectable style={[styles.body, { color: colors.accent }]}>
            {SUPPORT_EMAIL}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push('/support')}>
          <Text style={[styles.body, { color: colors.accent }]}>{t('support.title')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', padding: 24, paddingBottom: 48 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 18 },
  title: { fontSize: 26, fontWeight: '700' },
  date: { fontSize: 13 },
  section: { gap: 8 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 25 },
});
