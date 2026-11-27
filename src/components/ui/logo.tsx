import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Path } from 'react-native-svg';

import { useColors } from '@/theme/theme';

import { Txt } from './text';

type MarkProps = {
  size?: number;
  /** Heart colour. */
  color?: string;
  /** Left circle. */
  m1?: string;
  /** Right circle. */
  m2?: string;
  /** Overlap of both circles. */
  m3?: string;
};

/** The heart-pin with two overlapping circles: love first, then the plan you share. */
export function LogoMark({ size = 40, color, m1, m2, m3 }: MarkProps) {
  const colors = useColors();
  color ??= colors.indigo;
  m1 ??= colors.coral;
  m2 ??= colors.sun;
  // The overlap shows the background through, so it follows the theme.
  m3 ??= colors.bg;
  const clipId = `mk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={26} cy={25} r={8.5} />
        </ClipPath>
      </Defs>
      <Path
        d="M32 60C32 60 4 43 4 23.5 4 13.5 11.5 6 20.5 6 25.8 6 30 9 32 13.5 34 9 38.2 6 43.5 6 52.5 6 60 13.5 60 23.5 60 43 32 60 32 60z"
        fill={color}
      />
      <Circle cx={26} cy={25} r={8.5} fill={m1} />
      <Circle cx={38} cy={25} r={8.5} fill={m2} />
      <Circle cx={38} cy={25} r={8.5} fill={m3} clipPath={`url(#${clipId})`} />
    </Svg>
  );
}

export function LogoLockup({ size = 36, onDark = false }: { size?: number; onDark?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.25 }}>
      <LogoMark
        size={size}
        color={onDark ? colors.white : colors.indigo}
        m3={onDark ? colors.indigo : colors.bg}
      />
      <Txt
        variant="display"
        color={onDark ? colors.white : colors.indigo}
        style={{ fontSize: size * 0.8, lineHeight: size, letterSpacing: -size * 0.04 }}>
        planazo
      </Txt>
    </View>
  );
}
