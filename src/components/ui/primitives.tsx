import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { brand, fonts, type Palette, radius, space } from '@/theme/tokens';
import { makeStyles, useColors } from '@/theme/theme';

import { Icon, type IconName } from './icon';
import { Txt } from './text';

/* ---------- Pressable with a soft press state ---------- */

export function Tap({ style, ...rest }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
    />
  );
}

/* ---------- Button ---------- */

type ButtonTone = 'primary' | 'soft' | 'coral' | 'ghost' | 'white';

const buttonTones = (colors: Palette): Record<ButtonTone, { bg: string; fg: string; border?: string }> => ({
  primary: { bg: colors.indigo, fg: colors.white },
  soft: { bg: colors.lilac, fg: colors.indigoDeep },
  coral: { bg: colors.coral, fg: colors.white },
  ghost: { bg: 'transparent', fg: colors.ink, border: colors.line },
  white: { bg: colors.white, fg: brand.indigo },
});

export function Button({
  label,
  onPress,
  tone = 'primary',
  icon,
  disabled,
  style,
  compact,
  loading,
}: {
  label: string;
  onPress?: () => void;
  tone?: ButtonTone;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
}) {
  const colors = useColors();
  const styles = useStyles();
  const t = buttonTones(colors)[tone];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: t.bg, borderColor: t.border ?? t.bg },
        disabled && { opacity: 0.45 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={t.fg} />
      ) : icon ? (
        <Icon name={icon} size={compact ? 16 : 18} color={t.fg} strokeWidth={2.4} />
      ) : null}
      <Txt variant="button" color={t.fg} style={compact && { fontSize: 13 }}>
        {label}
      </Txt>
    </Tap>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'soft',
  size = 44,
  label,
  badge,
}: {
  icon: IconName;
  onPress?: () => void;
  tone?: ButtonTone;
  size?: number;
  label: string;
  badge?: number;
}) {
  const colors = useColors();
  const styles = useStyles();
  const t = buttonTones(colors)[tone];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={[
        styles.iconButton,
        { width: size, height: size, backgroundColor: t.bg, borderColor: t.border ?? t.bg },
      ]}>
      <Icon name={icon} size={size * 0.46} color={t.fg} strokeWidth={2.2} />
      {badge ? (
        <View style={styles.badge}>
          <Txt variant="caption" color={colors.white} style={{ fontFamily: fonts.bold, fontSize: 11 }}>
            {badge}
          </Txt>
        </View>
      ) : null}
    </Tap>
  );
}

/* ---------- Chip ---------- */

type ChipTone = 'indigo' | 'coral' | 'sun' | 'mint' | 'plain';

const chipTones = (colors: Palette): Record<ChipTone, { bg: string; fg: string }> => ({
  indigo: { bg: colors.lilac, fg: colors.indigoDeep },
  coral: { bg: colors.coralSoft, fg: colors.coralDeep },
  sun: { bg: colors.sunSoft, fg: colors.sunDeep },
  mint: { bg: colors.mint, fg: colors.mintDeep },
  plain: { bg: colors.bg, fg: colors.mute },
});

export function Chip({
  label,
  tone = 'indigo',
  icon,
  selected,
  onPress,
}: {
  label: string;
  tone?: ChipTone;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  const t = selected ? { bg: colors.indigo, fg: colors.white } : chipTones(colors)[tone];
  const content = (
    <>
      {icon ? <Icon name={icon} size={13} color={t.fg} strokeWidth={2.4} /> : null}
      <Txt variant="label" color={t.fg} style={{ fontSize: 12.5 }}>
        {label}
      </Txt>
    </>
  );
  if (!onPress) {
    return <View style={[styles.chip, { backgroundColor: t.bg }]}>{content}</View>;
  }
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        styles.chipTap,
        { backgroundColor: t.bg },
        tone === 'plain' && !selected && { borderWidth: 1.5, borderColor: colors.line },
      ]}>
      {content}
    </Tap>
  );
}

/* ---------- Avatars ---------- */

export function Avatar({
  initial,
  color,
  size = 32,
  ring,
  uri,
}: {
  initial: string;
  color: string;
  size?: number;
  ring?: string;
  /** Profile picture. The initial stays underneath while it loads (or if it fails). */
  uri?: string;
}) {
  const colors = useColors();
  ring ??= colors.bg;
  const darkText = color === colors.sun;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      <Txt
        variant="label"
        color={darkText ? colors.ink : colors.white}
        style={{ fontFamily: fonts.bold, fontSize: size * 0.4, lineHeight: size * 0.5 }}>
        {initial}
      </Txt>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

export function AvatarStack({
  people,
  size = 30,
  ring,
}: {
  people: { initial: string; color: string; id: string; avatarUrl?: string }[];
  size?: number;
  ring?: string;
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar initial={p.initial} color={p.color} uri={p.avatarUrl} size={size} ring={ring} />
        </View>
      ))}
    </View>
  );
}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}>
            <Txt variant="label" color={on ? colors.indigo : colors.mute} numberOfLines={1}>
              {o.label}
              {o.count !== undefined ? ` · ${o.count}` : ''}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Form ---------- */

export function Field({
  label,
  hint,
  icon,
  accessory,
  ...input
}: TextInputProps & {
  label: string;
  hint?: string;
  /** Leading icon inside the input. */
  icon?: IconName;
  /** Trailing element inside the input, e.g. a show-password toggle. */
  accessory?: ReactNode;
}) {
  const colors = useColors();
  const styles = useStyles();
  const textInput = (
    <TextInput
      placeholderTextColor={colors.faint}
      accessibilityLabel={label}
      {...input}
      style={[
        styles.input,
        input.multiline && { minHeight: 88, textAlignVertical: 'top' },
        (icon || accessory) ? styles.inputBare : null,
      ]}
    />
  );
  return (
    <View style={{ gap: space.xs + 2 }}>
      <Txt variant="label" color={colors.mute}>
        {label}
      </Txt>
      {icon || accessory ? (
        <View style={styles.inputRow}>
          {icon ? <Icon name={icon} size={18} color={colors.faint} /> : null}
          {textInput}
          {accessory}
        </View>
      ) : (
        textInput
      )}
      {hint ? (
        <Txt variant="caption" color={colors.faint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Txt variant="label" color={colors.mute}>
      {children}
    </Txt>
  );
}

/* ---------- Layout bits ---------- */

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="heading">{title}</Txt>
      {action ? (
        <Tap onPress={onAction} hitSlop={8}>
          <Txt variant="label" color={colors.indigo}>
            {action}
          </Txt>
        </Tap>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={colors.indigo} />
      </View>
      <Txt variant="heading" align="center">
        {title}
      </Txt>
      <Txt color={colors.mute} align="center" style={{ maxWidth: 280 }}>
        {body}
      </Txt>
      {action ? <Button label={action} onPress={onAction} tone="soft" compact /> : null}
    </View>
  );
}

export function Checkbox({ checked, color }: { checked: boolean; color?: string }) {
  const colors = useColors();
  const styles = useStyles();
  color ??= colors.indigo;
  return (
    <View
      style={[
        styles.check,
        checked && { backgroundColor: color, borderColor: color },
      ]}>
      {checked ? <Icon name="check" size={14} color={colors.white} strokeWidth={3} /> : null}
    </View>
  );
}

export function ProgressBar({ value, color, track }: { value: number; color?: string; track?: string }) {
  const colors = useColors();
  const styles = useStyles();
  color ??= colors.indigo;
  track ??= colors.lilac;
  return (
    <View style={[styles.bar, { backgroundColor: track }]}>
      <View style={[styles.barFill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  buttonCompact: { minHeight: 38, paddingHorizontal: space.md, borderRadius: 12 },
  iconButton: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipTap: { paddingHorizontal: 14, paddingVertical: 8 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  segmentOn: {
    backgroundColor: colors.raised,
    boxShadow: '0 1px 4px rgba(23,18,61,0.10)',
  },
  input: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
  inputBare: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 0, borderRadius: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  empty: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { height: 8, borderRadius: 9, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 9 },
}));
