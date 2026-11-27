import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InvitationCard } from '@/components/plan-cards';
import { EmptyState, IconButton, Segmented } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useInvitations } from '@/data/store';
import { GUTTER, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function ProposalsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pending, answered } = useInvitations();
  const [tab, setTab] = useState<'pendientes' | 'respondidas'>('pendientes');
  const list = tab === 'pendientes' ? pending : answered;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + space.xxl,
        paddingHorizontal: GUTTER,
        gap: space.xl,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconButton icon="back" label="Volver" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Txt variant="title">Propuestas</Txt>
          <Txt variant="label" color={colors.mute}>
            Planes que te han enviado
          </Txt>
        </View>
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pendientes', label: 'Pendientes', count: pending.length },
          { value: 'respondidas', label: 'Respondidas', count: answered.length },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState
          icon="send"
          title={tab === 'pendientes' ? 'Estás al día' : 'Aún no has respondido nada'}
          body={
            tab === 'pendientes'
              ? 'Cuando tu pareja o tus amigos te propongan un plan, aparecerá aquí.'
              : 'Las propuestas que respondas quedarán aquí.'
          }
        />
      ) : (
        <View style={{ gap: space.md }}>
          {list.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} plan={inv.plan} wide />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
