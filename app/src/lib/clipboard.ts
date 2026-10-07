import * as Clipboard from 'expo-clipboard';

// Copying text, on the phone and the web alike.
export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
