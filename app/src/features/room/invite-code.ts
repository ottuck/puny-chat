// Invite codes are four characters (docs/PROJECT.md, Room·초대 규칙). Shown and typed as two pairs,
// "K7 PM", which are easier to read out and type; the space is only for the eye.
export function spacedCode(code: string): string {
  return code.length > 2 ? `${code.slice(0, 2)} ${code.slice(2)}` : code;
}
