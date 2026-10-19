import { ApiError, createApiClient } from './api-client';
import { apiUrl } from './api-url';
import { auth } from './firebase';

// This app's server (docs/PROJECT.md, API), signed in with Firebase. The client itself is
// lib/api-client.ts.
export { ApiError };

// The current Firebase ID token. The SDK refreshes it when it is close to expiring; that needs the
// network, and fails for good when the account is gone (a guest past 30 days, a deleted account),
// which Firebase then signs out.
export async function idToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'UNAUTHORIZED');
  try {
    return await user.getIdToken();
  } catch (e) {
    if ((e as { code?: unknown }).code === 'auth/network-request-failed') {
      throw new ApiError(0, 'NETWORK');
    }
    throw new ApiError(401, 'UNAUTHORIZED');
  }
}

export const api = createApiClient({ baseUrl: apiUrl, token: idToken });
