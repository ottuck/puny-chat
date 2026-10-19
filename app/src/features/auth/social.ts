import { auth } from '@/lib/firebase';
import { createSocialAuth } from '@/lib/social-auth';

// Google and Apple sign-in for this app's Firebase project (lib/social-auth).
export const social = createSocialAuth(auth);
