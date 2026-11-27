import { Image } from 'expo-image';
import { useId } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { CoverKey, PlanPhoto } from '@/data/types';

// Illustrated "scene" covers from the design concept: gradient sky, a sun and two hills.
// Used when a plan has no photos, and as the placeholder while a photo loads.
const palettes: Record<CoverKey, [string, string, string, string, string]> = {
  sunset: ['#FFB199', '#FF6B4A', '#FFE08A', '#D94C2F', '#3F2FD6'],
  sea: ['#8EC5FF', '#FFD29A', '#FFF3C4', '#3F8FD6', '#2A1FA3'],
  clay: ['#FFD7C2', '#F2B48F', '#FF6B4A', '#B9775A', '#7A4A36'],
  dusk: ['#FFB36B', '#7D6CF0', '#FFF0B8', '#5B47E0', '#2A1FA3'],
  snow: ['#C7F0FF', '#9BD3E8', '#FFFFFF', '#5AA7C4', '#2C6F8A'],
  forest: ['#D9F2C4', '#8FD19E', '#FFF3B0', '#3E9B6A', '#1F5E44'],
  night: ['#2A1FA3', '#0E0B24', '#FFC23D', '#3F2FD6', '#17123D'],
  candy: ['#FFD6EC', '#C9B8FF', '#FFFFFF', '#9C86F5', '#3F2FD6'],
};

/** A plan's cover: its first photo when it has one, otherwise the illustrated scene. */
export function Cover({
  cover,
  photo,
  height = 120,
  radius = 0,
  style,
}: {
  cover: CoverKey;
  /** The plan's first photo, if any. */
  photo?: PlanPhoto;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ height, borderRadius: radius, overflow: 'hidden' }, style]}>
      <Scene cover={cover} />
      {photo?.url ? <Photo photo={photo} /> : null}
    </View>
  );
}

/** A plan photo filling its parent. Cached by storage path, so re-signed URLs don't re-download. */
export function Photo({ photo, contentFit = 'cover' }: { photo: PlanPhoto; contentFit?: 'cover' | 'contain' }) {
  return (
    <Image
      source={photo.path ? { uri: photo.url, cacheKey: photo.path } : { uri: photo.url }}
      style={StyleSheet.absoluteFill}
      contentFit={contentFit}
      transition={200}
      cachePolicy="memory-disk"
      accessibilityIgnoresInvertColors
    />
  );
}

function Scene({ cover }: { cover: CoverKey }) {
  const [a, b, sun, h1, h2] = palettes[cover];
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const h = 120;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 240 ${h}`} preserveAspectRatio="xMidYMax slice">
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="1" stopColor={b} />
        </LinearGradient>
      </Defs>
      <Rect width={240} height={h} fill={`url(#${gid})`} />
      <Circle cx={168} cy={h * 0.48} r={h * 0.2} fill={sun} />
      <Path d={`M0 ${h * 0.7} Q60 ${h * 0.45} 120 ${h * 0.66} T240 ${h * 0.6} V${h} H0z`} fill={h1} />
      <Path d={`M0 ${h * 0.86} Q80 ${h * 0.7} 150 ${h * 0.84} T240 ${h * 0.8} V${h} H0z`} fill={h2} />
    </Svg>
  );
}
