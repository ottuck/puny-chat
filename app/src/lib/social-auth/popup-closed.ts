// Native sign-in sheets report a cancel right away; only the web's popup needs this
// (popup-closed.web.ts).
export function onPopupClosed(_callback: () => void, _graceMs?: number): () => void {
  return () => {};
}
