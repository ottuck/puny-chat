type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
};

export function notice(title: string, message: string): void {
  window.alert(`${title}\n\n${message}`);
}

export async function confirm(options: ConfirmOptions): Promise<boolean> {
  await untilFocused();
  return window.confirm(`${options.title}\n\n${options.message}`);
}

// Chrome does not show confirm() unless the page is the active tab of the front window: it returns
// false at once. Right after a sign-in popup (Google) the popup is still in front, so wait for
// focus to come back.
function untilFocused(): Promise<void> {
  if (document.hasFocus()) return Promise.resolve();
  return new Promise((resolve) =>
    window.addEventListener('focus', () => resolve(), { once: true }),
  );
}
