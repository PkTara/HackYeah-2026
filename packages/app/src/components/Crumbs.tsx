import { Breadcrumbs } from '@hackyeah/ui';
import { useNavigation } from '../navigation/Navigator';
import type { RouteName } from '../navigation/routes';
import { trailFor } from '../navigation/trail';

/**
 * Breadcrumbs for a pushed screen, always the first thing on the page:
 * its place in the app (Hands > Right ring finger), with each earlier
 * level a button that goes straight back there. Hidden on the tabs.
 */
export function Crumbs() {
  const { route, params, backTo } = useNavigation<RouteName>();
  const trail = trailFor(route, params);
  if (trail.length < 2) {
    return null;
  }
  return (
    <Breadcrumbs
      crumbs={trail.map((step, i) => ({
        label: step.label,
        short: step.short,
        onPress:
          i < trail.length - 1 ? () => backTo(trail.slice(0, i + 1)) : undefined,
      }))}
    />
  );
}
