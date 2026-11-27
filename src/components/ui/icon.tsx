import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useColors } from '@/theme/theme';

// 24x24 icons with 2px rounded strokes, as in the design concept.
const icons = {
  home: <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  compass: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  calendar: (
    <>
      <Rect x={3} y={5} width={18} height={16} rx={3} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  heart: (
    <Path d="M12 20s-7.5-4.6-9-9.5C2 6.9 4.4 4 7.5 4c2 0 3.5 1.1 4.5 2.6C13 5.1 14.5 4 16.5 4 19.6 4 22 6.9 21 10.5 19.5 15.4 12 20 12 20z" />
  ),
  x: <Path d="M6 6l12 12M18 6L6 18" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  pin: (
    <>
      <Path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11z" />
      <Circle cx={12} cy={10} r={2.5} />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  send: <Path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" />,
  bell: (
    <>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <Path d="M10 21h4" />
    </>
  ),
  clock: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  bookmark: <Path d="M6 4h12v17l-6-4-6 4z" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  chevron: <Path d="M9 5l7 7-7 7" />,
  gift: (
    <>
      <Rect x={3} y={8} width={18} height={5} rx={1} />
      <Path d="M5 13v7h14v-7M12 8v12M12 8c-1.5-3-6-3.5-6-1 0 1.5 3 1 6 1zM12 8c1.5-3 6-3.5 6-1 0 1.5-3 1-6 1z" />
    </>
  ),
  star: <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  target: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Circle cx={12} cy={12} r={5} />
      <Circle cx={12} cy={12} r={1} />
    </>
  ),
  sparkle: <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  user: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  users: (
    <>
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.7.8 2.9 2.6 3.5 5.2" />
    </>
  ),
  globe: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  wallet: (
    <>
      <Rect x={3} y={6} width={18} height={14} rx={3} />
      <Path d="M16 13h2M3 10h18" />
    </>
  ),
  infinity: <Path d="M7.5 8.5C4.5 8.5 3 10.2 3 12s1.5 3.5 4.5 3.5c3.5 0 5.5-7 9-7 3 0 4.5 1.7 4.5 3.5s-1.5 3.5-4.5 3.5c-3.5 0-5.5-7-9-7z" />,
  copy: (
    <>
      <Rect x={8} y={8} width={12} height={12} rx={2.5} />
      <Path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  settings: (
    <>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  trash: <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  sun: (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  phone: (
    <>
      <Rect x={6} y={2.5} width={12} height={19} rx={3} />
      <Path d="M10.5 18.5h3" />
    </>
  ),
  mail: (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={3} />
      <Path d="M4 7.5l8 5.5 8-5.5" />
    </>
  ),
  lock: (
    <>
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={3} />
      <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  camera: (
    <>
      <Path d="M3 9a2 2 0 0 1 2-2h2.2l1.6-2.5h6.4L16.8 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Circle cx={12} cy={13} r={3.5} />
    </>
  ),
  eye: (
    <>
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <Circle cx={12} cy={12} r={3} />
    </>
  ),
  eyeOff: (
    <>
      <Path d="M10 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.3 7.3C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3" />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" />
    </>
  ),
} as const;

export type IconName = keyof typeof icons;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
};

export function Icon({ name, size = 22, color, strokeWidth = 2, fill = 'none' }: Props) {
  const colors = useColors();
  color ??= colors.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round">
      {icons[name]}
    </Svg>
  );
}
