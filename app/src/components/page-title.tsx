// The browser tab's title is web only (`page-title.web.tsx`). On iOS, expo-router's Head would
// also set up Handoff, which needs an `origin` in the config and fails on every screen without it.
export function PageTitle(_: { title?: string; count?: number }) {
  return null;
}
