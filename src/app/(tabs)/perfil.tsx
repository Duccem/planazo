import { useRouter } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import { TabScreen } from '@/components/screen';
import { Icon, type IconName } from '@/components/ui/icon';
import { LogoMark } from '@/components/ui/logo';
import { Avatar, Button, Chip, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { useAuth } from '@/data/auth';
import { useMe, useMyPlans, usePeople, useWishes } from '@/data/store';
import { radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const colors = useColors();
  const styles = useStyles();
  const me = useMe();
  const people = usePeople();
  const { scheduled, someday, done } = useMyPlans();
  const wishes = useWishes();
  const partner = people.find((p) => p.relation === 'pareja');
  const friends = people.filter((p) => p.relation === 'amigo');

  return (
    <TabScreen title="Perfil">
      {/* Me */}
      <View style={styles.meRow}>
        <Avatar initial={me.initial} color={me.color} size={68} ring={colors.lilac} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="title">{me.name}</Txt>
          <Txt variant="label" color={colors.mute}>
            {me.handle}
          </Txt>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat value={scheduled.length + someday.length} label="Por hacer" />
        <Stat value={done.length} label="Planazos" />
        <Stat value={wishes.filter((w) => w.done).length} label="Deseos" />
      </View>

      {/* Partner */}
      {partner ? (
        <View style={styles.couple}>
          <View style={styles.coupleAvatars}>
            <Avatar initial={me.initial} color={me.color} size={44} ring={colors.indigo} />
            <View style={{ marginLeft: -12 }}>
              <Avatar initial={partner.initial} color={partner.color} size={44} ring={colors.indigo} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" color="#DCD8FF">
              Tu pareja
            </Txt>
            <Txt variant="heading" color={colors.white}>
              {me.name} & {partner.name}
            </Txt>
          </View>
          <LogoMark size={34} color={colors.white} m3={colors.indigo} />
        </View>
      ) : null}

      {/* Friends */}
      <View style={{ gap: space.sm + 2 }}>
        <Txt variant="label" color={colors.mute}>
          AMIGOS · {friends.length}
        </Txt>
        <View style={styles.list}>
          {friends.map((f, i) => (
            <View key={f.id} style={[styles.listRow, i > 0 && styles.divider]}>
              <Avatar initial={f.initial} color={f.color} size={36} ring={colors.surface} />
              <Txt variant="bodyStrong" style={{ flex: 1 }}>
                {f.name}
              </Txt>
              <Chip label="Amigo" />
            </View>
          ))}
        </View>
      </View>

      {/* Invite */}
      <View style={styles.invite}>
        <Txt variant="label" color={colors.mute} align="center">
          Tu código para invitar
        </Txt>
        <Txt variant="display" color={colors.indigo} align="center" style={{ letterSpacing: 1 }}>
          {me.inviteCode}
        </Txt>
        <Txt variant="caption" color={colors.mute} align="center">
          Compártelo con tu pareja o amigos para planear juntos
        </Txt>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
          <Button label="Compartir enlace" icon="send" style={{ flex: 1 }} />
          <Button label="Tengo un código" tone="soft" style={{ flex: 1 }} />
        </View>
      </View>

      {/* Settings */}
      <View style={styles.list}>
        {(
          [
            ['bell', 'Notificaciones'],
            ['globe', 'Privacidad y comunidad'],
            ['settings', 'Ajustes', () => router.push('/ajustes')],
            ['lock', 'Cerrar sesión', () => confirmSignOut(signOut)],
          ] as [IconName, string, (() => void)?][]
        ).map(([icon, label, onPress], i) => (
          <Tap key={label} onPress={onPress} accessibilityRole="button" style={[styles.listRow, i > 0 && styles.divider]}>
            <Icon name={icon} size={20} color={colors.indigo} />
            <Txt variant="bodyStrong" style={{ flex: 1 }}>
              {label}
            </Txt>
            <Icon name="chevron" size={18} color={colors.faint} />
          </Tap>
        ))}
      </View>
    </TabScreen>
  );
}

/** The root layout's guard sends the user to the login once the session is gone. */
function confirmSignOut(signOut: () => Promise<{ error: string | null }>) {
  // react-native-web's Alert has no buttons.
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.('¿Cerrar sesión?')) void signOut();
    return;
  }
  Alert.alert('¿Cerrar sesión?', 'Tendrás que volver a entrar con tu correo y contraseña.', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Cerrar sesión',
      style: 'destructive',
      onPress: async () => {
        const { error } = await signOut();
        if (error) Alert.alert('No se pudo cerrar sesión', error);
      },
    },
  ]);
}

function Stat({ value, label }: { value: number; label: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Txt variant="title" color={colors.indigo}>
        {value}
      </Txt>
      <Txt variant="caption" color={colors.mute}>
        {label}
      </Txt>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  meRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  couple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  coupleAvatars: { flexDirection: 'row' },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md + 2, minHeight: 56 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  invite: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
}));
