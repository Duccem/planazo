import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { addDays, dayParts, pad2, startOfDay } from '@/lib/dates';
import { fonts, GUTTER, radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

import { Icon } from './ui/icon';
import { Chip, Tap } from './ui/primitives';
import { Txt } from './ui/text';

export type WhenValue = { mode: 'someday' } | { mode: 'date'; day: Date; time: string };

const TIMES = ['10:00', '13:30', '17:00', '19:00', '20:30', '22:00'];

export function whenToISO(v: WhenValue): string | undefined {
  if (v.mode === 'someday') return undefined;
  const [h, m] = v.time.split(':').map(Number);
  const d = new Date(v.day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function whenFromISO(iso: string | undefined): WhenValue {
  if (!iso) return { mode: 'someday' };
  const d = new Date(iso);
  return { mode: 'date', day: startOfDay(d), time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` };
}

/** Choose between "Algún día" and a concrete day + time. No native date picker needed. */
export function WhenPicker({ value, onChange }: { value: WhenValue; onChange: (v: WhenValue) => void }) {
  const colors = useColors();
  const styles = useStyles();
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 28 }, (_, i) => addDays(today, i));
  }, []);
  const isDate = value.mode === 'date';
  const times = isDate && !TIMES.includes(value.time) ? [...TIMES, value.time].sort() : TIMES;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.modes}>
        <ModeCard
          on={!isDate}
          icon="infinity"
          title="Algún día"
          body="Sin fecha, a la lista"
          onPress={() => onChange({ mode: 'someday' })}
        />
        <ModeCard
          on={isDate}
          icon="calendar"
          title="Con fecha"
          body="Elegid día y hora"
          onPress={() => onChange({ mode: 'date', day: isDate ? value.day : days[2], time: isDate ? value.time : '20:30' })}
        />
      </View>

      {isDate ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.sm, paddingHorizontal: GUTTER }}
            style={{ marginHorizontal: -GUTTER }}>
            {days.map((d, i) => {
              const on = d.getTime() === startOfDay(value.day).getTime();
              const p = dayParts(d);
              return (
                <Tap
                  key={d.toISOString()}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${p.weekday} ${p.day} ${p.month}`}
                  onPress={() => onChange({ ...value, day: d })}
                  style={[styles.day, on && styles.dayOn]}>
                  <Txt variant="caption" color={on ? '#DCD8FF' : colors.mute}>
                    {i === 0 ? 'Hoy' : p.weekday}
                  </Txt>
                  <Txt
                    variant="title"
                    color={on ? colors.white : colors.ink}
                    style={{ fontSize: 20, lineHeight: 24 }}>
                    {p.day}
                  </Txt>
                  <Txt variant="caption" color={on ? '#DCD8FF' : colors.mute}>
                    {p.month}
                  </Txt>
                </Tap>
              );
            })}
          </ScrollView>
          <View style={styles.times}>
            {times.map((t) => (
              <Chip key={t} label={t} tone="plain" selected={value.time === t} onPress={() => onChange({ ...value, time: t })} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function ModeCard({
  on,
  icon,
  title,
  body,
  onPress,
}: {
  on: boolean;
  icon: 'infinity' | 'calendar';
  title: string;
  body: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Tap
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.mode, on && styles.modeOn]}>
      <Icon name={icon} size={20} color={on ? colors.white : colors.indigo} />
      <Txt variant="bodyStrong" color={on ? colors.white : colors.ink}>
        {title}
      </Txt>
      <Txt variant="caption" color={on ? '#DCD8FF' : colors.mute} style={{ fontFamily: fonts.medium }}>
        {body}
      </Txt>
    </Tap>
  );
}

const useStyles = makeStyles((colors) => ({
  modes: { flexDirection: 'row', gap: space.sm },
  mode: { flex: 1, gap: 4, padding: space.md + 2, borderRadius: radius.lg, backgroundColor: colors.surface },
  modeOn: { backgroundColor: colors.indigo },
  day: {
    width: 58,
    paddingVertical: space.sm + 2,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  dayOn: { backgroundColor: colors.indigo },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));
