import { ApiError, createApiClient } from './api-client';
import { apiUrl } from './api-url';
import { auth } from './firebase';

// This app's server (docs/PROJECT.md, API), signed in with Firebase. The client itself is
// lib/api-client.ts.
export { ApiError };

// The current Firebase ID token. The SDK refreshes it when it is close to expiring.
export async function idToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'UNAUTHORIZED');
  return user.getIdToken();
}

export const api = createApiClient({ baseUrl: apiUrl, token: idToken });
