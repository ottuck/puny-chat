import { View } from 'react-native';

import { PageTitle } from '@/components/page-title';
import { InviteContent } from '@/features/room/components/invite-sheet';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/theme';

// A guest's code for opening their own room somewhere else (another browser, the home-screen app,
// another phone): whoever enters it there takes their seat (docs/PROJECT.md, 다시 초대와 옮기기).
// A screen rather than a sheet, like the rest of settings: the web's back button works.
export default function MoveScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageTitle title={t('invite.moveTitle')} />
      <InviteContent self />
    </View>
  );
}
