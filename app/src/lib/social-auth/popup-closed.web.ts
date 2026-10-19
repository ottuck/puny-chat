// Firebase notices a closed sign-in popup only 8 seconds later: it waits in case the result is
// still on its way. Focus coming back to the page is the sign that the popup closed, so a screen
// can stop waiting `graceMs` after that. A result that was coming has arrived by then, and one
// that comes later still signs in. Returns a cleanup for useEffect.
export function onPopupClosed(callback: () => void, graceMs = 1000): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onFocus = () => {
    timer = setTimeout(callback, graceMs);
  };
  window.addEventListener('focus', onFocus, { once: true });
  return () => {
    window.removeEventListener('focus', onFocus);
    clearTimeout(timer);
  };
}
