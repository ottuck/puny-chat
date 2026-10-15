import type { Message } from './types';

const minuteOf = (iso: string) => Math.floor(Date.parse(iso) / 60_000);

// Two text messages belong to the same visual run when the same member sent them within the
// same minute. Runs are drawn close together and only the newest one shows its time.
function sameRun(a: Message | undefined, b: Message | undefined): boolean {
  return (
    a?.type === 'TEXT' &&
    b?.type === 'TEXT' &&
    a.senderId === b.senderId &&
    minuteOf(a.createdAt) === minuteOf(b.createdAt)
  );
}

// `messages` is newest first: index - 1 is the next newer message, index + 1 the next older.
export function runPosition(messages: Message[], index: number) {
  const message = messages[index];
  return {
    continuesOlder: sameRun(message, messages[index + 1]),
    showTime: !sameRun(message, messages[index - 1]),
  };
}

export function formatTime(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(iso),
  );
}

// Past the level a buddy is grown at, a day of chatting can bring a level up every few messages.
// Of those, only the day's newest line stays in the timeline; the stage still celebrates each one.
// Up to that level every one shows: each is a step the two are waiting for.
export function foldLevelUps(messages: Message[], grownAt: number): Message[] {
  const days = new Set<string>();
  return messages.filter((message) => {
    if (message.type !== 'BUDDY_EVENT' || message.event !== 'LEVELED_UP') return true;
    if ((message.level ?? 0) <= grownAt) return true;
    const day = new Date(message.createdAt).toDateString();
    if (days.has(day)) return false;
    days.add(day);
    return true;
  });
}
