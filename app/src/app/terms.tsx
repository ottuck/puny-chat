import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PageTitle } from '@/components/page-title';
import { TermsBody } from '@/features/terms/terms-body';
import { MAX_CONTENT_WIDTH, useColors } from '@/theme';

// Public like the privacy policy: readable before starting, in the app's language.
export default function TermsScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <PageTitle title={t('terms.title')} />
      <View style={styles.column}>
        <TermsBody />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', padding: 24, paddingBottom: 48 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: 18 },
});
