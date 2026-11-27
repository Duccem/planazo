import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Icon } from '@/components/ui/icon';
import { Button, Chip, Field, FieldLabel, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { wishKinds, wishOwners } from '@/data/meta';
import { useActions, usePartner } from '@/data/store';
import type { WishKind, WishOwner } from '@/data/types';
import { radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const KINDS: WishKind[] = ['regalo', 'actividad', 'meta'];
const OWNERS: WishOwner[] = ['ambos', 'yo', 'pareja'];

const placeholders: Record<WishKind, string> = {
  regalo: 'Ej. Unos auriculares inalámbricos',
  actividad: 'Ej. Ver ballenas en libertad',
  meta: 'Ej. Ahorrar para la entrada del piso',
};

export default function NewWishSheet() {
  const colors = useColors();
  const params = useLocalSearchParams<{ kind?: WishKind }>();
  const router = useRouter();
  const partner = usePartner();
  const { addWish } = useActions();
  const [kind, setKind] = useState<WishKind>(params.kind && wishKinds[params.kind] ? params.kind : 'regalo');
  const [owner, setOwner] = useState<WishOwner>(params.kind === 'regalo' || !params.kind ? 'yo' : 'ambos');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const ownerLabel = (o: WishOwner) => (o === 'pareja' && partner ? `Para ${partner.name}` : wishOwners[o]);

  return (
    <Sheet
      title="Nuevo deseo"
      subtitle={partner ? `Se comparte con ${partner.name}` : undefined}
      footer={
        <Button
          label="Añadir a la lista"
          icon="plus"
          disabled={title.trim().length < 2}
          onPress={() => {
            addWish({ kind, owner, title: title.trim(), note: note.trim() || undefined });
            router.back();
          }}
        />
      }>
      <View style={styles.kinds}>
        {KINDS.map((k) => {
          const meta = { ...wishKinds[k], bg: colors[wishKinds[k].bg], fg: colors[wishKinds[k].fg] };
          const on = k === kind;
          return (
            <Tap
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setKind(k)}
              style={[styles.kind, { backgroundColor: on ? meta.bg : colors.surface, borderColor: on ? meta.fg : 'transparent' }]}>
              <Icon name={meta.icon} size={24} color={meta.fg} />
              <Txt variant="label" color={on ? meta.fg : colors.ink}>
                {meta.label}
              </Txt>
            </Tap>
          );
        })}
      </View>

      <Field label="¿Qué es?" placeholder={placeholders[kind]} value={title} onChangeText={setTitle} autoFocus />
      <Field
        label="Nota (opcional)"
        placeholder={kind === 'regalo' ? 'Talla, color, enlace…' : 'Cualquier detalle'}
        value={note}
        onChangeText={setNote}
      />

      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>¿Para quién?</FieldLabel>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {OWNERS.map((o) => (
            <Chip key={o} label={ownerLabel(o)} tone="plain" selected={o === owner} onPress={() => setOwner(o)} />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', gap: space.sm },
  kind: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
});
