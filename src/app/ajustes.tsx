import { View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { FieldLabel, Tap } from '@/components/ui/primitives';
import { Txt } from '@/components/ui/text';
import { makeStyles, type ThemePreference, useColors, useTheme } from '@/theme/theme';
import { radius, space } from '@/theme/tokens';

const OPTIONS: { value: ThemePreference; label: string; body: string; icon: IconName }[] = [
  { value: 'system', label: 'Automático', body: 'Igual que tu móvil', icon: 'phone' },
  { value: 'light', label: 'Claro', body: 'Fondo blanco', icon: 'sun' },
  { value: 'dark', label: 'Oscuro', body: 'Fondo de noche', icon: 'moon' },
];

export default function SettingsSheet() {
  const { preference, setPreference } = useTheme();
  const colors = useColors();
  const styles = useStyles();

  return (
    <Sheet title="Ajustes">
      <View style={{ gap: space.sm + 2 }}>
        <FieldLabel>Apariencia</FieldLabel>
        <View style={styles.options} accessibilityRole="radiogroup">
          {OPTIONS.map((o) => {
            const on = o.value === preference;
            return (
              <Tap
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${o.label}. ${o.body}`}
                onPress={() => setPreference(o.value)}
                style={[styles.option, on && styles.optionOn]}>
                <Icon name={o.icon} size={22} color={on ? colors.white : colors.indigo} />
                <Txt variant="bodyStrong" color={on ? colors.white : colors.ink}>
                  {o.label}
                </Txt>
                <Txt variant="caption" color={on ? '#DCD8FF' : colors.mute}>
                  {o.body}
                </Txt>
              </Tap>
            );
          })}
        </View>
        <Txt variant="caption" color={colors.faint}>
          En automático, Planazo cambia entre claro y oscuro cuando lo hace tu móvil.
        </Txt>
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  options: { flexDirection: 'row', gap: space.sm },
  option: {
    flex: 1,
    gap: 4,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  optionOn: { backgroundColor: colors.indigo },
}));
