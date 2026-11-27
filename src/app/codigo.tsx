import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { FormError } from '@/components/auth';
import { Sheet } from '@/components/sheet';
import { Button, Field, FieldLabel, Segmented } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useActions, usePartner } from '@/data/store';
import type { Relation } from '@/data/types';
import { space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const CODE = /^PLZ-[A-Z0-9]{4}$/;

/** "plz48k2" / "PLZ 48K2" → "PLZ-48K2" */
function normalize(raw: string) {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = chars.startsWith('PLZ') ? chars.slice(3) : chars;
  return body ? `PLZ-${body.slice(0, 4)}` : '';
}

export default function RedeemCodeSheet() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ relation?: Relation }>();
  const partner = usePartner();
  const { redeemCode } = useActions();
  const [code, setCode] = useState('');
  // Default to partner only when asked for it and there isn't one yet.
  const [relation, setRelation] = useState<Relation>(params.relation === 'pareja' && !partner ? 'pareja' : 'amigo');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = CODE.test(code);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await redeemCode(code, relation);
    setSubmitting(false);
    if (result.error) return setError(result.error);
    router.back();
    Alert.alert(
      '¡Conectados!',
      relation === 'pareja'
        ? `${result.name} y tú ya compartís la lista de deseos.`
        : `${result.name} ya está en tus amigos.`,
    );
  };

  return (
    <Sheet
      title="Tengo un código"
      subtitle="Conecta con quien te lo ha pasado"
      footer={
        <Button label="Conectar" icon="users" disabled={!valid} loading={submitting} onPress={submit} />
      }>
      <Field
        label="Código de invitación"
        placeholder="PLZ-XXXX"
        value={code}
        onChangeText={(t) => setCode(t.length < code.length ? t.toUpperCase() : normalize(t))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        maxLength={8}
        returnKeyType="done"
        onSubmitEditing={valid ? submit : undefined}
      />

      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>¿Quién es para ti?</FieldLabel>
        <Segmented
          value={relation}
          onChange={setRelation}
          options={[
            { value: 'pareja', label: 'Mi pareja' },
            { value: 'amigo', label: 'Un amigo' },
          ]}
        />
        <Txt variant="caption" color={colors.faint}>
          {relation === 'pareja'
            ? partner
              ? `Ya estás conectado con ${partner.name} como pareja. Quítalo desde Perfil para cambiarla.`
              : 'Con tu pareja compartes la lista de deseos y os podéis enviar planes.'
            : 'Con tus amigos os podéis enviar planes.'}
        </Txt>
      </View>

      <FormError message={error} />
    </Sheet>
  );
}
