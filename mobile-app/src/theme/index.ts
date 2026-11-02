/**
 * Driver Finder design tokens, taken from the approved design canvas (v0.2).
 * Signal yellow and road black come from the client's logo. Yellow fills main
 * actions (always with black text on it), black anchors selection and plans,
 * green means verified, red is only for rejection and reports.
 */
export const colors = {
  yellow: '#FEBE02',
  yellowDark: '#E0A600',
  yellow50: '#FFF8E1',
  yellow100: '#FFF1C2',
  yellow200: '#FFE08A',
  yellow300: '#FFD24D',
  yellowText: '#6B4E00',

  ink: '#111111',
  ink2: '#4A4A47',
  muted: '#67665F',
  faint: '#A3A29A',

  bg: '#F6F5F1',
  surface: '#FFFFFF',
  surface2: '#EFEEE9',
  line: '#E7E5DF',
  lineStrong: '#DAD8D0',
  neutralSoft: '#ECEAE3',
  neutralText: '#2B2B2B',

  green: '#16803C',
  greenSoft: '#E5F5EA',
  greenText: '#11612E',
  whatsapp: '#15803D',
  red: '#C2323A',
  redSoft: '#FDECEC',
  redText: '#9E1F27',
  white: '#FFFFFF',
};

/** Vehicle category key. The admin can add new ones, so any string is allowed. */
export type CategoryKey = string;

/** One vehicle category, one colour: tag tint, accent and readable text. Unknown keys use `neutralCategory`. */
export const category: Record<string, { bg: string; fg: string; text: string }> = {
  truck: { bg: '#FFEDE3', fg: '#C2410C', text: '#7C2D12' },
  tempo: { bg: '#E1F1FB', fg: '#0A7DB8', text: '#09496B' },
  bus: { bg: '#DFF3F0', fg: '#0E8A7C', text: '#0A4F47' },
  minibus: { bg: '#DFF3F0', fg: '#0E8A7C', text: '#0A4F47' },
  car: { bg: '#EEEAFE', fg: '#6A4FD6', text: '#36277F' },
  suv: { bg: '#EEEAFE', fg: '#6A4FD6', text: '#36277F' },
};

export const neutralCategory = { bg: '#ECEAE3', fg: '#4A4A47', text: '#2B2B2B' };

export const font = {
  regular: 'NotoSans-Regular',
  medium: 'NotoSans-Medium',
  semibold: 'NotoSans-SemiBold',
  bold: 'NotoSans-Bold',
  extrabold: 'NotoSans-ExtraBold',
};

export type FontWeight = keyof typeof font;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

/**
 * Android hardware elevation. CSS-style boxShadow is drawn in software on
 * Android and made frames late, so it is not used anywhere in the app.
 */
export const shadow = {
  card: { elevation: 1, shadowColor: '#111111' },
  raised: { elevation: 6, shadowColor: '#111111' },
  sheet: { elevation: 16, shadowColor: '#111111' },
};
