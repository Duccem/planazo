// Planazo design tokens (design concept v0.1)

const light = {
  bg: '#FFFFFF', // screen and sheet background
  raised: '#FFFFFF', // elevated pieces on top of surface (selected segment)
  indigo: '#3F2FD6', // primary, buttons, active tab
  indigoDeep: '#2A1FA3', // pressed, text on lilac
  ink: '#17123D', // body text
  mute: '#6B6890', // secondary text
  faint: '#8A87AB', // tertiary text, inactive tabs
  line: '#E3E1F5', // borders, dividers
  lineStrong: '#C9C6EA', // checkbox outline
  lilac: '#ECEAFF', // chips, soft buttons
  surface: '#F3F2FF', // cards
  coral: '#FF6B4A', // person A, likes, match
  coralSoft: '#FFE6DF',
  coralDeep: '#B8371B',
  sun: '#FFC23D', // person B, ratings, highlights
  sunSoft: '#FFF1CC',
  sunDeep: '#7A5300',
  mint: '#DDF5EA',
  mintDeep: '#17744B',
  white: '#FFFFFF', // text and icons on accent fills, in both themes
  night: '#0E0B24', // dark ground
};

export type Palette = typeof light;
export type ColorToken = keyof Palette;
export type Scheme = 'light' | 'dark';

const dark: Palette = {
  bg: '#0E0B24',
  raised: '#2E2766',
  indigo: '#6E5FFF',
  indigoDeep: '#CFC9FF',
  ink: '#F2F0FF',
  mute: '#A9A5CC',
  faint: '#7F7BA6',
  line: '#2A2456',
  lineStrong: '#4B4485',
  lilac: '#262058',
  surface: '#1A1640',
  coral: '#FF6B4A',
  coralSoft: '#3D1E24',
  coralDeep: '#FF9C84',
  sun: '#FFC23D',
  sunSoft: '#3A2F14',
  sunDeep: '#FFD36E',
  mint: '#12382B',
  mintDeep: '#5FD49B',
  white: '#FFFFFF',
  night: '#0E0B24',
};

export const palettes: Record<Scheme, Palette> = { light, dark };

/** Fixed light-theme brand colours for data that must not change with the theme (e.g. avatar colours). */
export const brand = light;

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  display: 'Unbounded_700Bold',
  displaySemi: 'Unbounded_600SemiBold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  title: { fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
} as const;

export type TypeVariant = keyof typeof type;

/** Horizontal gutter used by every screen. */
export const GUTTER = space.lg + 4;
