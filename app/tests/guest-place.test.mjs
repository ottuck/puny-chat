import assert from 'node:assert/strict';
import test from 'node:test';

import { isInAppBrowser, placeFromUserAgent } from '../src/features/auth/guest-place-ua.ts';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';

test('in-app browsers are told apart from the browser they look like', () => {
  assert.equal(placeFromUserAgent(`${IPHONE} Mobile/15E148 KAKAOTALK 25.8.0`, false), 'kakaotalk');
  assert.equal(placeFromUserAgent(`${IPHONE} Mobile/15E148 Safari Line/15.0.0`, false), 'line');
  assert.equal(
    placeFromUserAgent(`${IPHONE} Mobile/15E148 Instagram 350.0`, false),
    'inAppBrowser',
  );
  assert.ok(isInAppBrowser('kakaotalk'));
  assert.ok(!isInAppBrowser('safari'));
});

test('browsers and the home screen app', () => {
  assert.equal(
    placeFromUserAgent(`${IPHONE} Version/26.0 Mobile/15E148 Safari/604.1`, false),
    'safari',
  );
  assert.equal(
    placeFromUserAgent(`${IPHONE} Version/26.0 Mobile/15E148 Safari/604.1`, true),
    'homeScreen',
  );
  assert.equal(
    placeFromUserAgent(`${IPHONE} CriOS/140.0 Mobile/15E148 Safari/604.1`, false),
    'chrome',
  );
  assert.equal(
    placeFromUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/140.0 Safari/537.36 Edg/140.0', false),
    'edge',
  );
  assert.equal(
    placeFromUserAgent(
      'Mozilla/5.0 (Linux; Android 15) SamsungBrowser/28.0 Chrome/130.0 Mobile Safari/537.36',
      false,
    ),
    'samsung',
  );
  assert.equal(placeFromUserAgent('curl/8', false), 'browser');
});
