import type { Href } from 'expo-router';

import { useAuth } from './auth-provider';

// Where "back" goes when there is nowhere to go back to (components/header-back.tsx): the chat, or
// the first screen before signing in. The route guards then pick the right place for a signed-in
// person without a room or a name.
export function useHome(): Href {
  const { user } = useAuth();
  return user ? '/' : '/sign-in';
}
