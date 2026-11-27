import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { brand, fonts } from '@/theme/tokens';

/** Must match `imageWidth` of the expo-splash-screen plugin in app.json so the hand-off is seamless. */
export const SPLASH_LOGO_SIZE = 120;
export const SPLASH_BACKGROUND = brand.indigo;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HEART =
  'M32 60C32 60 4 43 4 23.5 4 13.5 11.5 6 20.5 6 25.8 6 30 9 32 13.5 34 9 38.2 6 43.5 6 52.5 6 60 13.5 60 23.5 60 43 32 60 32 60z';

type Props = {
  /** Called once the overlay is laid out, i.e. the moment to hide the native splash. */
  onReady: () => void;
  /** Called when the exit animation ends; unmount the overlay then. */
  onFinish: () => void;
};

/**
 * Continues the native splash: starts on the identical frame (logo centred on indigo),
 * plays a heartbeat while the two circles "hug", reveals the wordmark and fades out.
 */
export function AnimatedSplash({ onReady, onFinish }: Props) {
  const reduceMotion = useReducedMotion();
  const clipId = `splash${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const scale = useSharedValue(1);
  const hug = useSharedValue(0); // 0 = resting, 1 = circles pulled together
  const word = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    const finish = (done?: boolean) => {
      'worklet';
      if (done) scheduleOnRN(onFinish);
    };

    if (reduceMotion) {
      word.value = 1;
      exit.value = withDelay(500, withTiming(1, { duration: 250 }, finish));
      return;
    }

    const beat = Easing.out(Easing.cubic);
    scale.value = withDelay(
      150,
      withSequence(
        withTiming(1.14, { duration: 170, easing: beat }),
        withTiming(0.97, { duration: 150, easing: beat }),
        withTiming(1.08, { duration: 150, easing: beat }),
        withTiming(1, { duration: 260, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
    hug.value = withDelay(
      150,
      withSequence(
        withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.out(Easing.back(2)) }),
      ),
    );
    word.value = withDelay(450, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
    exit.value = withDelay(1500, withTiming(1, { duration: 380, easing: Easing.in(Easing.cubic) }, finish));
  }, [reduceMotion, scale, hug, word, exit, onFinish]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * (1 + exit.value * 0.35) }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value * (1 - exit.value),
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  // Coral circle (and the clip that shapes the overlap) moves right, sun circle moves left.
  const leftProps = useAnimatedProps(() => ({ cx: 26 + hug.value * 3 }));
  const rightProps = useAnimatedProps(() => ({ cx: 38 - hug.value * 3 }));

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={onReady}
      style={[StyleSheet.absoluteFill, styles.root, containerStyle]}>
      <Animated.View style={markStyle}>
        <Svg width={SPLASH_LOGO_SIZE} height={SPLASH_LOGO_SIZE} viewBox="0 0 64 64">
          <Defs>
            <ClipPath id={clipId}>
              <AnimatedCircle cy={25} r={8.5} animatedProps={leftProps} />
            </ClipPath>
          </Defs>
          <Path d={HEART} fill={brand.white} />
          <AnimatedCircle cy={25} r={8.5} fill={brand.coral} animatedProps={leftProps} />
          <AnimatedCircle cy={25} r={8.5} fill={brand.sun} animatedProps={rightProps} />
          <AnimatedCircle
            cy={25}
            r={8.5}
            fill={SPLASH_BACKGROUND}
            clipPath={`url(#${clipId})`}
            animatedProps={rightProps}
          />
        </Svg>
      </Animated.View>
      {/* Absolutely placed so the mark stays exactly where the native splash drew it. */}
      <View style={styles.wordSlot} pointerEvents="none">
        <Animated.Text style={[styles.word, wordStyle]}>planazo</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  wordSlot: {
    position: 'absolute',
    top: '50%',
    marginTop: SPLASH_LOGO_SIZE / 2 + 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  word: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.2,
    color: brand.white,
  },
});
