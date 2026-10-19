import type { PreparedPhoto } from './photo';

// The picked photo as a JPEG no longer than `maxEdge`, drawn straight into a canvas of that size. The
// image manipulator would first copy the photo into a canvas of its full size, and Safari on the
// iPhone caps a canvas's area: a 24-megapixel photo fails there. JPEG, because Safari cannot encode
// WebP (the server writes WebP). Browsers draw a photo the way its EXIF says, so it comes out upright.
export async function resizePhoto(
  uri: string,
  maxEdge: number,
  quality: number,
): Promise<PreparedPhoto> {
  const image = await load(uri);
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No canvas to resize the photo in.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('The photo could not be encoded.');
  return { uri: URL.createObjectURL(blob), width, height };
}

function load(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The photo could not be read.'));
    image.src = uri;
  });
}

// The resized photo is held in memory under a blob: address until it is let go.
export function releasePhoto(uri: string) {
  if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}
