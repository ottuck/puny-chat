import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/theme';

import { JOB_ICON } from '../../jobs';
import type { Notice } from './acts';

// A note over the stage (use-notices.ts): the next goal after growing, or about the job.
export function StageNotice({ notice }: { notice: Notice }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={[styles.notice, styles.passThrough]}>
      <Text
        style={[
          styles.noticeText,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.accent },
        ]}
      >
        {t(`buddy.${notice.key}`, {
          level: notice.level,
          icon: notice.job ? JOB_ICON[notice.job] : '',
          job: notice.job ? t(`buddy.job.${notice.job}`) : '',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    top: 40,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  passThrough: {
    pointerEvents: 'none',
  },
});
