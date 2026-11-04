import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import {
  type Auth,
  linkWithCredential,
  OAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
} from 'firebase/auth';

import { linkUser, signedInUser } from './account';
import { revokeAppleToken } from './revoke-apple-token';
import type { SocialAuthOptions, SocialProvider } from './types';

// Sign in with Apple (App Store Guideline 4.8), through Apple's own sheet and then Firebase.
// Needs `ios.usesAppleSignIn` in app.json. Signing in asks Apple for the name (the person can edit
// or hide it in Apple's sheet), so the app does not ask again (Guideline 4.0). No email is asked for.
async function appleSheet(withName = false) {
  // Ties Apple's token to this request: Apple gets the SHA-256 of the nonce, Firebase the raw one.
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const result = await AppleAuthentication.signInAsync({
    nonce,
    requestedScopes: withName ? [AppleAuthentication.AppleAuthenticationScope.FULL_NAME] : [],
  });
  if (!result.identityToken) throw new Error('Apple returned no identity token.');
  const credential = new OAuthProvider('apple.com').credential({
    idToken: result.identityToken,
    rawNonce,
  });
  // Apple gives the name only the first time someone signs in to the app.
  const name = result.fullName ? AppleAuthentication.formatFullName(result.fullName).trim() : '';
  return { credential, authorizationCode: result.authorizationCode, name };
}

export function appleProvider(
  auth: Auth,
  { onProfileName }: Pick<SocialAuthOptions, 'onProfileName'> = {},
): SocialProvider {
  return {
    id: 'apple',
    supported: true,
    signIn: async () => {
      const { credential, name } = await appleSheet(true);
      // Before Firebase signs in, so the app has the name by the time it sees the new user.
      if (name) onProfileName?.(name);
      await signInWithCredential(auth, credential);
    },
    link: async () => {
      const user = signedInUser(auth);
      const { credential } = await appleSheet();
      await linkUser(
        user,
        () => linkWithCredential(user, credential),
        (e) => OAuthProvider.credentialFromError(e),
      );
    },
    // Also revokes the app's Apple tokens, which Apple asks for when an account is deleted (needs
    // the Services ID and key in the Firebase Apple provider). A failure stops the deletion before
    // data is lost.
    reauthenticate: async () => {
      const user = signedInUser(auth);
      const { credential, authorizationCode } = await appleSheet();
      await reauthenticateWithCredential(user, credential);
      await revokeAppleToken({
        apiKey: auth.app.options.apiKey!,
        idToken: await user.getIdToken(),
        authorizationCode: authorizationCode ?? '',
        bundleId: Constants.expoConfig?.ios?.bundleIdentifier ?? '',
        tenantId: auth.tenantId,
      });
    },
    switchTo: async (credential) => {
      await signInWithCredential(auth, credential);
    },
  };
}
