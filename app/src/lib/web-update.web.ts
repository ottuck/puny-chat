// A web app added to an iPhone's home screen has no reload button and is only paused when left, so
// it would keep the version it first loaded through any number of deploys. Each deploy writes its
// version to /version.json (scripts/worker-assets.mjs) and into the bundle; when the app comes back
// into view and the two differ, it loads the new one. Development builds have no version and skip.
const CURRENT = process.env.EXPO_PUBLIC_WEB_VERSION;
const MIN_GAP_MS = 60_000;

export function watchForNewVersion(): void {
  if (!CURRENT) return;
  let checkedAt = 0;
  const check = async () => {
    if (document.visibilityState !== 'visible' || Date.now() - checkedAt < MIN_GAP_MS) return;
    checkedAt = Date.now();
    try {
      const response = await fetch('/version.json', { cache: 'no-store' });
      const { version } = (await response.json()) as { version?: string };
      if (version && version !== CURRENT) window.location.reload();
    } catch {
      // Offline or the file missing: try again next time.
    }
  };
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
}
