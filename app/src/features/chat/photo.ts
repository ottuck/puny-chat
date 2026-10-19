import { api } from '@/lib/api';
import { apiUrl } from '@/lib/api-url';

import { resizePhoto } from './photo-resize';
import type { ServerMessage } from './types';

// The server stores at most this on the longer side (server: chat/PhotoStore.MAX_EDGE). Resizing here
// first keeps the upload small (the original never leaves the device); the server writes it again as
// WebP either way.
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export type PreparedPhoto = { uri: string; width: number; height: number };

// One photo from the library, made small enough to send, or null when the user cancelled.
export async function pickPhoto(): Promise<PreparedPhoto | null> {
  // Loaded on use: older iPhone builds lack the native modules (photo-support.ts).
  const ImagePicker = await import('expo-image-picker');
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = picked.canceled ? undefined : picked.assets[0];
  if (!asset) return null;
  return resizePhoto(asset.uri, MAX_EDGE, JPEG_QUALITY);
}

// Stores the photo as a message (docs/PROJECT.md, 사진). The same clientMessageId again returns the
// message stored the first time.
export async function uploadPhoto(
  clientMessageId: string,
  photo: PreparedPhoto,
): Promise<ServerMessage> {
  const body = await (await fetch(photo.uri)).blob();
  return api<ServerMessage>(
    `/api/rooms/me/photos?clientMessageId=${encodeURIComponent(clientMessageId)}`,
    { method: 'POST', body, contentType: 'image/jpeg' },
  );
}

export const photoUrl = (roomId: string, photoId: string) =>
  `${apiUrl()}/photos/${roomId}/${photoId}.webp`;
