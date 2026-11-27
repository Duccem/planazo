import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Avatar, Button, Checkbox, Chip, Field, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { responseMeta } from '@/data/meta';
import { useActions, usePeople, usePlan } from '@/data/store';
import { radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

export default function SendSheet() {
  const colors = useColors();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const plan = usePlan(id);
  const people = usePeople();
  const { sendPlan } = useActions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  if (!plan) return null;

  const sentTo = new Map(plan.sharedWith.map((s) => [s.personId, s.response]));
  const partner = people.filter((p) => p.relation === 'pareja');
  const friends = people.filter((p) => p.relation === 'amigo');

  const toggle = (pid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });

  const groups = [
    { title: 'PAREJA', items: partner },
    { title: 'AMIGOS', items: friends },
  ].filter((g) => g.items.length);

  return (
    <Sheet
      title="Enviar plan"
      subtitle={plan.title}
      footer={
        <Button
          label={selected.size ? `Enviar a ${selected.size}` : 'Elige a alguien'}
          icon="send"
          disabled={!selected.size}
          onPress={() => {
            sendPlan(plan.id, [...selected]);
            router.back();
          }}
        />
      }>
      <Txt color={colors.mute}>Les llegará el plan y podrán decir si se apuntan, quizás, o pasan.</Txt>

      {groups.map((g) => (
        <View key={g.title} style={{ gap: space.sm + 2 }}>
          <Txt variant="label" color={colors.mute}>
            {g.title}
          </Txt>
          <View style={styles.list}>
            {g.items.map((p, i) => {
              const already = sentTo.get(p.id);
              const on = selected.has(p.id);
              return (
                <Tap
                  key={p.id}
                  disabled={!!already}
                  onPress={() => toggle(p.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: !!already }}
                  style={[styles.row, i > 0 && styles.divider]}>
                  <Avatar initial={p.initial} color={p.color} size={38} ring={colors.surface} />
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>
                    {p.name}
                  </Txt>
                  {already ? (
                    <Chip label={responseMeta[already].label} tone={responseMeta[already].tone} />
                  ) : (
                    <Checkbox checked={on} />
                  )}
                </Tap>
              );
            })}
          </View>
        </View>
      ))}

      <Field
        label="Mensaje (opcional)"
        placeholder="¿Nos animamos este finde?"
        value={note}
        onChangeText={setNote}
        multiline
      />
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 60 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
}));
