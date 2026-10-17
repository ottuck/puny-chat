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
  return window.confirm(`${options.title}\n\n${options.message}`);
}
