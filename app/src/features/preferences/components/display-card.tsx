import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { WebFrame } from '@/components/web-frame';
import { setLanguagePreference, setThemePreference, usePreferences } from '@/lib/preferences';
import { useColors } from '@/theme';

export function DisplayCard() {
  const colors = useColors();
  const { t } = useTranslation();
  const { theme, language } = usePreferences();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.caption, { color: colors.textMuted }]}>{t('settings.display')}</Text>
      <PreferenceRow
        title={t('settings.language')}
        value={language}
        onChange={setLanguagePreference}
        options={[
          ['system', t('settings.followDevice')],
          ['ko', '한국어'],
          ['ja', '日本語'],
          ['en', 'English'],
        ]}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <PreferenceRow
        title={t('settings.theme')}
        value={theme}
        onChange={setThemePreference}
        options={[
          ['system', t('settings.followDevice')],
          ['light', t('settings.light')],
          ['dark', t('settings.dark')],
        ]}
      />
    </View>
  );
}

function PreferenceRow<T extends string>({
  title,
  value,
  onChange,
  options,
}: {
  title: string;
  value: T;
  onChange: (value: T) => void;
  options: [T, string][];
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const currentLabel = options.find(([option]) => option === value)?.[1];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${currentLabel}`}
        aria-expanded={open}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.55 : 1 }]}
      >
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.value}>
          <Text style={[styles.valueLabel, { color: colors.textMuted }]}>{currentLabel}</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="m9 5 7 7-7 7"
              fill="none"
              stroke={colors.textMuted}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType={Platform.OS === 'web' ? 'none' : 'fade'}
        onRequestClose={() => setOpen(false)}
      >
        <WebFrame transparent>
          <View nativeID="preferences-overlay" style={styles.overlay}>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={StyleSheet.absoluteFill}
            />
            <View
              role="dialog"
              aria-modal
              accessibilityLabel={title}
              style={[
                styles.sheet,
                { backgroundColor: colors.surface, paddingBottom: Math.max(20, insets.bottom + 8) },
              ]}
            >
              <View style={styles.header}>
                <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
                  {title}
                </Text>
                <Pressable
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                  style={styles.close}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      d="m6 6 12 12M18 6 6 18"
                      fill="none"
                      stroke={colors.textMuted}
                      strokeWidth={1.7}
                      strokeLinecap="round"
                    />
                  </Svg>
                </Pressable>
              </View>
              <ScrollView bounces={false}>
                <View accessibilityRole="radiogroup" accessibilityLabel={title}>
                  {options.map(([option, label], index) => {
                    const selected = option === value;
                    return (
                      <View key={option}>
                        {index > 0 ? (
                          <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        ) : null}
                        <Pressable
                          onPress={() => {
                            onChange(option);
                            setOpen(false);
                          }}
                          accessibilityRole="radio"
                          accessibilityLabel={label}
                          aria-checked={selected}
                          style={({ pressed }) => [
                            styles.option,
                            { backgroundColor: pressed ? colors.background : 'transparent' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              { color: colors.text, fontWeight: selected ? '600' : '400' },
                            ]}
                          >
                            {label}
                          </Text>
                          {selected ? (
                            <Svg width={22} height={22} viewBox="0 0 24 24">
                              <Path
                                d="m5 12 4 4L19 6"
                                fill="none"
                                stroke={colors.accent}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          ) : null}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </WebFrame>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  caption: { fontSize: 13, marginBottom: 8 },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  rowTitle: { flex: 1, fontSize: 16 },
  value: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueLabel: { flexShrink: 1, fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 12, backgroundColor: '#00000055' },
  sheet: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    maxHeight: '85%',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '600' },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  optionLabel: { flex: 1, fontSize: 16 },
});
