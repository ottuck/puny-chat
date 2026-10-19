import type { PreparedPhoto } from './photo';

// The picked photo as a JPEG no longer than `maxEdge`. JPEG, because Safari cannot encode WebP (the
// server writes WebP); drawing it again also turns an iPhone photo upright.
export async function resizePhoto(
  uri: string,
  maxEdge: number,
  quality: number,
): Promise<PreparedPhoto> {
  // Loaded on use: older iPhone builds lack the native module (photo-support.ts).
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  // The picker may not know the size; the rendered image does.
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const scale = maxEdge / Math.max(original.width, original.height);
  const image =
    scale < 1
      ? await ImageManipulator.manipulate(uri)
          .resize({
            width: Math.round(original.width * scale),
            height: Math.round(original.height * scale),
          })
          .renderAsync()
      : original;
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

// The resized file sits in the app's cache, which the system clears: nothing to give back here.
export function releasePhoto(_uri: string) {}
