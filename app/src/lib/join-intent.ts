// "Start with an invite code" on the first screen: the join screen is only for signed-in users with
// a name, so the wish is kept (in memory, this session) until they have started and picked one.
let wanted = false;

export function setJoinIntent(want: boolean): void {
  wanted = want;
}

export function takeJoinIntent(): boolean {
  const was = wanted;
  wanted = false;
  return was;
}
