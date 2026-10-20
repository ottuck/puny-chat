import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { WebFrame } from '@/components/web-frame';
import { giftKey } from '@/features/buddy/gifts';
import { GIFT_PALETTE, giftArt } from '@/features/buddy/pixel/gifts';
import { PixelSprite } from '@/features/buddy/pixel/pixel-sprite';
import type { PushState } from '@/features/notifications/push';
import { useColors } from '@/theme';

import { markRead, type MailAction, type MailKey, type ShownMail } from './mail';

// The mailbox's list of letters and news, and one opened on a sheet of letter paper.

const PAPER = '#FFFBF2';
const INK = '#4A3B33';
const INK_LIGHT = '#8A7F78';
const RULE = '#EFE3CF';
const ICONS: Record<ShownMail['kind'], string> = {
  letter: '💌',
  notice: '📮',
  guide: '📌',
  gift: '🎁',
};
const GIFT_SCALE = 5;

export function MailboxSheet({
  visible,
  mails,
  read,
  onClose,
  guest = false,
  onTurnOnPush,
  onGraduate,
  buddyName,
}: {
  visible: boolean;
  mails: ShownMail[];
  read: MailKey[];
  onClose: () => void;
  // Whether the account button still has something to do.
  guest?: boolean;
  // Must run straight from the tap: the browser asks for permission only while handling one.
  onTurnOnPush?: () => Promise<PushState>;
  // While the room's buddy may go its own way: opens its details, where that is done.
  onGraduate?: () => void;
  // Who signs the gifts: they are from the room's buddy now.
  buddyName: string;
}) {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<MailKey | null>(null);
  // A letter's words are its own; a gift's are the buddy's, by what it made.
  const words = (mail: ShownMail) =>
    mail.kind === 'gift'
      ? {
          title: t(giftKey(mail.gift, 'name')),
          body: t(giftKey(mail.gift, 'line')),
          from: t('mailbox.giftFrom', { buddy: buddyName }),
        }
      : {
          title: t(`mailbox.mail.${mail.id}.title`),
          body: t(`mailbox.mail.${mail.id}.body`),
          from: t(`mailbox.mail.${mail.id}.from`),
        };
  const opened = mails.find((mail) => mail.id === open);
  const date = (day: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${day}T00:00:00`));
  const [denied, setDenied] = useState(false);
  // What to open once this sheet is gone: an iPhone shows one sheet at a time, so the next waits for
  // this one to be dismissed.
  const next = useRef<(() => void) | null>(null);
  const dismissed = () => {
    const then = next.current;
    next.current = null;
    then?.();
  };
  const close = () => {
    setOpen(null);
    setDenied(false);
    onClose();
  };
  const act = (action: MailAction) => {
    if (action === 'linkAccount') {
      close();
      router.push('/settings');
      return;
    }
    if (action === 'graduate') {
      next.current = onGraduate ?? null;
      close();
      if (Platform.OS !== 'ios') dismissed();
      return;
    }
    onTurnOnPush?.()
      .then((next) => setDenied(next === 'denied'))
      .catch((e) => console.warn('turning on notifications failed', e));
  };
  const action = opened?.action;
  const showAction =
    action === 'turnOnPush'
      ? !!onTurnOnPush && !denied
      : action === 'graduate'
        ? !!onGraduate
        : action === 'linkAccount' && guest;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
      onDismiss={dismissed}
    >
      <WebFrame>
        <View style={[styles.screen, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={[styles.column, { paddingBottom: 24 + insets.bottom }]}
          >
            <View style={styles.topBar}>
              {opened ? (
                <Pressable onPress={() => setOpen(null)} accessibilityRole="button" hitSlop={12}>
                  <Text style={[styles.close, { color: colors.accent }]}>
                    ‹ {t('mailbox.back')}
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable onPress={close} accessibilityRole="button" hitSlop={12}>
                <Text style={[styles.close, { color: colors.accent }]}>{t('common.close')}</Text>
              </Pressable>
            </View>

            {opened ? (
              // A sheet of letter paper: ruled, the date in the corner, signed at the bottom.
              <View style={styles.paper}>
                <Text style={styles.paperDate}>{date(opened.date)}</Text>
                {opened.kind === 'gift' ? (
                  <View style={styles.paperGift}>
                    <PixelSprite
                      frame={giftArt(opened.gift)}
                      palette={GIFT_PALETTE}
                      scale={GIFT_SCALE}
                    />
                  </View>
                ) : null}
                <Text style={styles.paperTitle}>{words(opened).title}</Text>
                <View style={styles.rule} />
                <Text style={styles.paperBody}>{words(opened).body}</Text>
                <Text style={styles.paperSign}>{words(opened).from}</Text>
                {denied ? (
                  <Text style={styles.paperNote}>{t('settings.notificationsDeniedWeb')}</Text>
                ) : null}
                {action && showAction ? (
                  <View style={styles.paperAction}>
                    <Button label={t(`mailbox.action.${action}`)} onPress={() => act(action)} />
                  </View>
                ) : null}
              </View>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t('mailbox.title')}</Text>
                <View style={styles.list}>
                  {mails.map((mail) => {
                    const unread = !read.includes(mail.id);
                    return (
                      <Pressable
                        key={mail.id}
                        onPress={() => {
                          markRead(mail.id);
                          setOpen(mail.id);
                        }}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.item,
                          { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text style={styles.icon}>{ICONS[mail.kind]}</Text>
                        <View style={styles.itemText}>
                          <Text style={[styles.kind, { color: colors.accent }]}>
                            {t(`mailbox.kind.${mail.kind}`)}
                          </Text>
                          <Text
                            style={[styles.itemTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {words(mail).title}
                          </Text>
                          <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                            {date(mail.date)}
                          </Text>
                        </View>
                        {unread ? (
                          <View
                            style={[styles.dot, { backgroundColor: colors.accent }]}
                            accessibilityLabel={t('mailbox.unread')}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </WebFrame>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  close: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  list: {
    gap: 10,
    marginTop: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  icon: {
    fontSize: 26,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  kind: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemDate: {
    fontSize: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paper: {
    marginTop: 16,
    backgroundColor: PAPER,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: RULE,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  paperDate: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: INK_LIGHT,
  },
  paperGift: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  paperTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: INK,
    marginTop: 8,
  },
  rule: {
    height: 1,
    backgroundColor: RULE,
    marginVertical: 14,
  },
  paperBody: {
    fontSize: 15,
    lineHeight: 26,
    color: INK,
  },
  paperNote: {
    fontSize: 13,
    lineHeight: 20,
    color: INK_LIGHT,
    marginTop: 16,
  },
  paperAction: {
    marginTop: 20,
  },
  paperSign: {
    alignSelf: 'flex-end',
    fontSize: 14,
    fontWeight: '600',
    color: INK,
    marginTop: 18,
  },
});
