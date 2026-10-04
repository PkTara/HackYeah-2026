import { AppText, Button, Panel } from '@hackyeah/ui';
import { exportRoutes } from '../export/useExportSnapshot';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { useSport } from '../state/SportProvider';

/**
 * The way into Export from a profile, the same in every mode: one quiet
 * panel with one button.
 */
export function ExportEntry() {
  const { navigate } = useNavigation<RouteName>();
  const { mode } = useSport();
  return (
    <Panel variant="quiet" title="Share your record" icon="share">
      <AppText variant="caption">
        Make a summary for your doctor, physio, coach or family. It stays on
        this device until you share it.
      </AppText>
      <Button
        title="Export"
        icon="share"
        variant="secondary"
        onPress={() => navigate(exportRoutes(mode).pick)}
      />
    </Panel>
  );
}
