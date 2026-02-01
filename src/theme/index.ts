// Theme colors matching the reference design
export const colors = {
  primary: '#3366CC',
  primaryDark: '#2D4A7C',
  accent: '#E68A00',
  accentLight: '#F5A623',
  background: '#F0F4F8',
  cardBackground: '#FFFFFF',
  headerBackground: '#3366CC',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',
  textAccent: '#E68A00',
  border: '#E5E7EB',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
};

export const borderRadius = {
  sm: 4, md: 8, lg: 12, xl: 16, full: 9999,
};

export const typography = {
  fontSizes: { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 24 },
  fontWeights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export default { colors, spacing, borderRadius, typography };
