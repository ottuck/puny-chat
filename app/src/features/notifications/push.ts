import i18n from '@/i18n';
import { api } from '@/lib/api';
import { createPush } from '@/lib/push';

// Push notifications for new messages (docs/PROJECT.md, 푸시 알림 · 웹 푸시): lib/push asks and
// subscribes on each platform, this tells our server where to send. The language goes too: the
// server writes some notices itself (a guest's days left).
export type { PushState } from '@/lib/push';

// While the app is open the chat already shows new messages, so no banner or sound on top.
export const {
  pushSupported,
  pushEnabled,
  registerForPush,
  setPushEnabled,
  unregisterPush,
  onNotificationTap,
} = createPush(
  {
    addExpoToken: (token) =>
      api<void>('/api/me/push-tokens', {
        method: 'POST',
        body: { token, language: i18n.language },
      }),
    removeExpoToken: (token) =>
      api<void>(`/api/me/push-tokens/${encodeURIComponent(token)}`, { method: 'DELETE' }),
    webPushKey: async () => (await api<{ publicKey: string }>('/api/me/web-push/key')).publicKey,
    addWebPush: (subscription) =>
      api<void>('/api/me/web-push', {
        method: 'POST',
        body: { ...subscription, language: i18n.language },
      }),
    removeWebPush: (endpoint) =>
      api<void>(`/api/me/web-push?endpoint=${encodeURIComponent(endpoint)}`, {
        method: 'DELETE',
      }),
  },
  { showWhileOpen: false },
);
