import { useFocusEffect } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback } from 'react';

const APP_NAME = 'puny-chat';

// The browser tab's title (web). Each screen renders one: Head only applies inside the focused
// screen, and with none the tab's title would be empty. Head alone can keep the last screen's title
// after a redirect (e.g. the web's back button bounced back to the chat), so the focused screen also
// sets it directly.
// `count`: unread messages, shown first like other messengers do ("(2) puny-chat").
export function PageTitle({ title, count = 0 }: { title?: string; count?: number }) {
  const name = title ? `${title} · ${APP_NAME}` : APP_NAME;
  const full = count > 0 ? `(${count}) ${name}` : name;
  useFocusEffect(
    useCallback(() => {
      document.title = full;
    }, [full]),
  );
  return (
    <Head>
      <title>{full}</title>
    </Head>
  );
}
