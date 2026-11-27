import { useRouter } from 'expo-router';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Button, FieldLabel, IconButton } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { type NotificationKind, useNotificationPreferences } from '@/data/notification-preferences';
import { type PushPermission, usePushPermission } from '@/lib/push';
import { makeStyles, useColors } from '@/theme/theme';
import { GUTTER, radius, space } from '@/theme/tokens';

const KINDS: { kind: NotificationKind; label: string; body: string; icon: IconName }[] = [
  { kind: 'invitations', label: 'Propuestas de planes', body: 'Cuando alguien te propone un plan', icon: 'send' },
  {
    kind: 'invitation_responses',
    label: 'Respuestas a tus propuestas',
    body: 'Cuando dicen sí, quizás o no a un plan tuyo',
    icon: 'check',
  },
  { kind: 'connections', label: 'Nuevas conexiones', body: 'Cuando alguien usa tu código', icon: 'users' },
];

const PERMISSION_COPY: Record<Exclude<PushPermission, 'granted'>, { title: string; body: string; action?: string }> = {
  undetermined: {
    title: 'Activa las notificaciones',
    body: 'Planazo necesita tu permiso para avisarte en este móvil.',
    action: 'Activar',
  },
  blocked: {
    title: 'Notificaciones desactivadas',
    body: 'Las has bloqueado en los ajustes del móvil. Actívalas allí para recibir avisos.',
    action: 'Abrir ajustes',
  },
  unavailable: {
    title: 'No disponibles aquí',
    body: 'Las notificaciones solo funcionan en la app de Android o iPhone.',
  },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prefs, loading, setPreference } = useNotificationPreferences();
  const { permission, enable } = usePushPermission();

  const notice = permission && permission !== 'granted' ? PERMISSION_COPY[permission] : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + space.xxl,
        paddingHorizontal: GUTTER,
        gap: space.xl,
      }}>
      <View style={styles.header}>
        <IconButton icon="back" label="Volver" onPress={() => router.back()} />
        <Txt variant="title" style={{ flex: 1 }}>
          Notificaciones
        </Txt>
      </View>

      {notice && (
        <View style={styles.notice}>
          <Icon name="bell" size={22} color={colors.sunDeep} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="bodyStrong">{notice.title}</Txt>
            <Txt variant="caption" color={colors.mute}>
              {notice.body}
            </Txt>
          </View>
          {notice.action && <Button label={notice.action} compact onPress={() => void enable()} />}
        </View>
      )}

      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>Avísame de</FieldLabel>
        <View style={styles.list}>
          {KINDS.map((k, i) => (
            <View key={k.kind} style={[styles.row, i > 0 && styles.divider]}>
              <Icon name={k.icon} size={20} color={colors.indigo} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="bodyStrong">{k.label}</Txt>
                <Txt variant="caption" color={colors.mute}>
                  {k.body}
                </Txt>
              </View>
              <Switch
                accessibilityLabel={k.label}
                value={prefs[k.kind]}
                disabled={loading}
                onValueChange={(value) => void setPreference(k.kind, value)}
                trackColor={{ true: colors.indigo, false: colors.line }}
                thumbColor={colors.white}
              />
            </View>
          ))}
        </View>
        <Txt variant="caption" color={colors.faint}>
          Se aplica a todos tus dispositivos.
        </Txt>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.sunSoft,
  },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md + 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
}));
