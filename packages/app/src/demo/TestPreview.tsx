import { useState } from 'react';
import { AppText, Button, Panel, Tag } from '@hackyeah/ui';
import { useDemo } from './DemoProvider';

export function TestPreview({ title, text }: { title: string; text: string }) {
  const demo = useDemo();
  const enabled = demo.settings.enabled && demo.settings.previews;
  const [shown, setShown] = useState(false);
  return (
    <Panel
      variant="quiet"
      title={title}
      badge={<Tag text={enabled ? 'Demo available' : 'Soon'} tone="muted" />}
    >
      <AppText>{text}</AppText>
      {enabled ? (
        <>
          <Button
            title={`Preview ${title}`}
            small
            variant="secondary"
            onPress={() => setShown(!shown)}
          />
          {shown ? (
            <>
              <Tag text="Simulated preview" />
              <AppText>
                {title === 'Shoulder reach'
                  ? 'Left 165°, right 160°'
                  : 'Left 32 kg, right 34 kg — example force-gauge readings'}
              </AppText>
              <AppText variant="caption">
                Example output for a future test. No camera or sensor measured
                these values, and they are not saved as evidence.
              </AppText>
            </>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}
