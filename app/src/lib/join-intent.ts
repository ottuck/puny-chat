// "Start with an invite code" on the first screen: the code is typed before there is an account,
// and the join screen that uses it is only for signed-in users with a name. So the code is kept
// (in memory, this session) until they have started and picked one; then it is used right away.
let pending: string | null = null;

export function setJoinIntent(code: string | null): void {
  pending = code;
}

export function takeJoinIntent(): string | null {
  const code = pending;
  pending = null;
  return code;
}
