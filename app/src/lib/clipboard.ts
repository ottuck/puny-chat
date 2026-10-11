import * as Clipboard from 'expo-clipboard';

// Copying text, on the phone and the web alike.
export async function copyText(text: string): Promise<void> {
  const copied = await Clipboard.setStringAsync(text);
  if (!copied) throw new Error('Clipboard copy failed');
}
