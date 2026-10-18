import AsyncStorage from '@react-native-async-storage/async-storage';

// What was typed and not sent yet, kept on this device (docs/PROJECT.md, 입력하던 글): a reload
// (the web's new version, web-update.web.ts), a closed app or a mistaken refresh brings it back, as
// in other messengers. Kept per person and room, and dropped on signing out. Best effort: a failed
// read or write only means the box starts empty.
const PREFIX = 'draft:';

const keyOf = (userId: string, roomId: string) => `${PREFIX}${userId}:${roomId}`;

export async function loadDraft(userId: string, roomId: string): Promise<string> {
  return (await AsyncStorage.getItem(keyOf(userId, roomId))) ?? '';
}

// Written on every change, so nothing typed just before leaving is lost.
export function saveDraft(userId: string, roomId: string, text: string): void {
  const key = keyOf(userId, roomId);
  (text.trim() ? AsyncStorage.setItem(key, text) : AsyncStorage.removeItem(key)).catch((e) =>
    console.warn('saving the draft failed', e),
  );
}

// Signing out, switching accounts or deleting the account: what was typed is someone's own.
export async function clearDrafts(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const drafts = keys.filter((key) => key.startsWith(PREFIX));
  if (drafts.length) await AsyncStorage.multiRemove(drafts);
}
