import { useTranslation } from 'react-i18next';

import { giftKey, type GiftKind } from '@/features/buddy/gifts';
import { GIFT_PALETTE, giftArt } from '@/features/buddy/pixel/gifts';
import { PixelSprite } from '@/features/buddy/pixel/pixel-sprite';

import { EventCard } from './buddy-event-row';

// What the buddy made me at work, handed over in the chat (docs/fun-improvements.md, 직업 선물): its
// picture, the chat line, and the buddy's word with it. A postcard is a letter, so it goes to the
// mailbox as well, and the card says so with the way there.
export function GiftCard({
  gift,
  title,
  onReadPostcard,
}: {
  gift: GiftKind;
  title: string;
  onReadPostcard?: () => void;
}) {
  const { t } = useTranslation();
  const postcard = gift.job === 'WRITER';
  return (
    <EventCard
      picture={<PixelSprite frame={giftArt(gift)} palette={GIFT_PALETTE} scale={3} />}
      title={title}
      body={postcard ? t('chat.postcardBody') : t(giftKey(gift, 'line'))}
      action={postcard && onReadPostcard ? `🏞️ ${t('chat.readPostcard')}` : undefined}
      onAction={onReadPostcard}
    />
  );
}
