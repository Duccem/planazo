import { Text as RNText, type TextProps } from 'react-native';

import { type as typeScale, type TypeVariant } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export type TxtProps = TextProps & {
  variant?: TypeVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export function Txt({ variant = 'body', color, align, style, ...rest }: TxtProps) {
  const colors = useColors();
  color ??= colors.ink;
  return <RNText style={[typeScale[variant], { color, textAlign: align }, style]} {...rest} />;
}
