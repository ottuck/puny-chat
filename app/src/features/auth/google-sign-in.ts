// Native Google sign-in needs a native module and an iOS OAuth client, not set up yet
// (CLAUDE.md, Auth); until then phones link with Apple instead.
export const googleSignInSupported = false;

export async function signInWithGoogle(): Promise<void> {
  throw new Error('Google sign-in is not available in this build yet.');
}

export async function linkGoogle(): Promise<void> {
  throw new Error('Google sign-in is not available in this build yet.');
}

export async function reauthenticateGoogle(): Promise<void> {
  throw new Error('Google sign-in is not available in this build yet.');
}
