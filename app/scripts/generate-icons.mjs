// Export the selected illustration using the image runtime already bundled with Expo CLI.
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const expo = createRequire(require.resolve('expo/package.json'));
const cli = createRequire(expo.resolve('@expo/cli/package.json'));
const images = createRequire(cli.resolve('@expo/image-utils/package.json'));
const Jimp = images('jimp-compact');
const background = 0xfdf9e8ff;
const source = (file) => fileURLToPath(new URL('../assets/brand/' + file, import.meta.url));

const icon = await Jimp.read(source('puny-icon-source.png'));
const character = (await Jimp.read(source('puny-character.png'))).autocrop();
const monochrome = (await Jimp.read(source('puny-monochrome.png'))).autocrop();

function resize(image, width, height = width) {
  return image.clone().resize(width, height, Jimp.RESIZE_BICUBIC);
}

// Fit every visible pixel inside the platform's safe circle, including the sprout and feet.
function place(image, size, safeDiameter, opaque = false) {
  const { width, height, data } = image.bitmap;
  let radius = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        radius = Math.max(radius, Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2));
      }
    }
  }
  if (!radius) throw new Error('The character source is empty');
  const scale = (size * safeDiameter * 0.5 - 2) / radius;
  const foreground = resize(image, Math.floor(width * scale), Math.floor(height * scale));
  const canvas = new Jimp(size, size, opaque ? background : 0x00000000);
  canvas.composite(
    foreground,
    Math.floor((size - foreground.bitmap.width) / 2),
    Math.floor((size - foreground.bitmap.height) / 2),
  );
  return canvas;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}

function save(file, image, opaque = false) {
  // Write RGB explicitly: jimp-compact's RGB encoder can misinterpret its RGBA bitmap.
  const { width, height, data } = image.bitmap;
  const channels = opaque ? 3 : 4;
  const stride = width * channels + 1;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceOffset = (y * width + x) * 4;
      const targetOffset = y * stride + 1 + x * channels;
      data.copy(pixels, targetOffset, sourceOffset, sourceOffset + channels);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = opaque ? 2 : 6;
  writeFileSync(
    new URL('../' + file, import.meta.url),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('sRGB', Buffer.from([0])),
      chunk('IDAT', deflateSync(pixels, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
  console.log(file + ': ' + width + ' x ' + height);
}

// The iOS and ordinary web icons retain candidate 2's complete cream illustration.
save('assets/images/icon.png', resize(icon, 1024), true);
save('assets/images/favicon.png', resize(icon, 48), true);
save('public/apple-touch-icon.png', resize(icon, 180), true);
save('public/icon-192.png', resize(icon, 192), true);
save('public/icon-512.png', resize(icon, 512), true);

save('assets/images/android-icon-foreground.png', place(character, 1024, 66 / 108));
save('assets/images/android-icon-background.png', new Jimp(1024, 1024, background), true);
save('assets/images/android-icon-monochrome.png', place(monochrome, 1024, 66 / 108));
save('assets/images/splash-icon.png', place(character, 256, 0.95));
save('public/icon-maskable-512.png', place(character, 512, 0.8, true), true);
save('public/badge.png', place(monochrome, 96, 0.95));
