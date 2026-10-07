// Sign in with Apple is iPhone only for now (apple-sign-in.ios.ts). The web would need an Apple
// Services ID; Android comes later.
export const appleSignInSupported = false;

export async function signInWithApple(): Promise<void> {
  throw new Error('Sign in with Apple is not available here.');
}

export async function linkApple(): Promise<void> {
  throw new Error('Sign in with Apple is not available here.');
}

export async function reauthenticateApple(): Promise<void> {
  throw new Error('Sign in with Apple is not available here.');
}
