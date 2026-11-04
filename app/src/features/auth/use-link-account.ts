import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { confirm } from '@/lib/confirm';
import {
  type LinkOutcome,
  linkOrSwitch,
  onPopupClosed,
  type SocialProvider,
} from '@/lib/social-auth';

import { noteAccountLinked, prepareAccountSwitch } from './actions';

// Linking Google or Apple to the guest: the Firebase uid stays the same, so nothing moves on the
// server. If that account already has a user, confirm and switch to it (the guest's buddy and chats
// stay behind). `onDone` runs once linked or switched: the account is no longer a guest.
export function useLinkAccount(onDone?: (outcome: LinkOutcome) => void) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A closed popup takes Firebase 8 seconds to report; the buttons come back as soon as it closes.
  useEffect(() => (busy ? onPopupClosed(() => setBusy(false)) : undefined), [busy]);

  const link = async (provider: SocialProvider) => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await linkOrSwitch(provider, {
        confirmSwitch: () =>
          confirm({
            title: t('settings.accountInUseTitle'),
            message: t('settings.accountInUseMessage'),
            confirmLabel: t('settings.accountInUseConfirm'),
            cancelLabel: t('common.cancel'),
            destructive: true,
          }),
        beforeSwitch: prepareAccountSwitch,
      });
      if (outcome === 'linked') await noteAccountLinked();
      if (outcome === 'linked' || outcome === 'switched') onDone?.(outcome);
    } catch (e) {
      console.warn(e);
      setError(t('settings.linkFailed'));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, link };
}
