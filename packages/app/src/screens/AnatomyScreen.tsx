import { AppText } from '@hackyeah/ui';
import { BackButton } from '../components/BackButton';
import { PageHeader } from '../components/PageHeader';
import { TabScreen } from '../components/TabScreen';

// Placeholder, being built.
export function AnatomyScreen() {
  return (
    <TabScreen>
      <BackButton />
      <PageHeader title="Hand anatomy" />
      <AppText>Coming together.</AppText>
    </TabScreen>
  );
}
