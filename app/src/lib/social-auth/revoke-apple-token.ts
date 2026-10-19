type Revocation = {
  apiKey: string;
  idToken: string;
  authorizationCode: string;
  bundleId: string;
  tenantId?: string | null;
};

// Firebase's iOS SDK uses this request for revokeToken(withAuthorizationCode:).
// The JS SDK's revokeAccessToken accepts ACCESS_TOKEN, not Apple's native authorization code.
// https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseAuth/Sources/Swift/Backend/RPC/RevokeTokenRequest.swift
export async function revokeAppleToken(request: Revocation): Promise<void> {
  if (!request.authorizationCode || !request.bundleId) {
    throw new Error('Missing Apple authorization code or iOS bundle identifier.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=${encodeURIComponent(request.apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ios-Bundle-Identifier': request.bundleId,
        },
        body: JSON.stringify({
          providerId: 'apple.com',
          tokenType: 'CODE',
          token: request.authorizationCode,
          idToken: request.idToken,
          ...(request.tenantId ? { tenantId: request.tenantId } : {}),
        }),
        signal: controller.signal,
      },
    );
    // Do not delete server data if Apple's authorization could not be revoked. Retrying starts
    // with a fresh Apple sign-in and code; secrets and tokens never go into error messages.
    if (!response.ok) throw new Error(`Apple token revocation failed (${response.status}).`);
  } finally {
    clearTimeout(timeout);
  }
}
