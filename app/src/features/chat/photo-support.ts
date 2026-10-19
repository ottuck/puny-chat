import { requireOptionalNativeModule } from 'expo';

// iPhone builds made before photos have neither native module; there the photo button is hidden
// rather than the app crashing when the module loads (docs/PROJECT.md, 사진).
export const canSendPhotos =
  requireOptionalNativeModule('ExponentImagePicker') !== null &&
  requireOptionalNativeModule('ExpoImageManipulator') !== null;
