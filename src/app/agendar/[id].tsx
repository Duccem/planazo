import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/primitives';
import { WhenPicker, whenFromISO, whenToISO, type WhenValue } from '@/components/when-picker';
import { useActions, usePlan } from '@/data/store';

export default function ScheduleSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const plan = usePlan(id);
  const { schedulePlan, setSaved } = useActions();
  // A finished plan being repeated starts from "algún día" again.
  const [when, setWhen] = useState<WhenValue>(() => whenFromISO(plan?.done ? undefined : plan?.date));

  if (!plan) return null;

  return (
    <Sheet
      title="¿Cuándo lo hacéis?"
      subtitle={plan.title}
      footer={
        <Button
          label={when.mode === 'someday' ? 'Guardar para algún día' : 'Agendar plan'}
          icon={when.mode === 'someday' ? 'infinity' : 'calendar'}
          onPress={() => {
            schedulePlan(plan.id, whenToISO(when));
            if (!plan.inMyList) setSaved(plan.id, true);
            router.back();
          }}
        />
      }>
      <WhenPicker value={when} onChange={setWhen} />
    </Sheet>
  );
}
