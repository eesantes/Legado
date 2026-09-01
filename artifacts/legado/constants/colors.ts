/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#F7F5FF',
    tint: '#A98CFF',

    background: '#0B0914',
    foreground: '#F7F5FF',

    card: '#151126',
    cardForeground: '#F7F5FF',

    primary: '#A98CFF',
    primaryForeground: '#0B0914',

    secondary: '#211A38',
    secondaryForeground: '#E9E3FF',

    muted: '#211A38',
    mutedForeground: '#A9A0C5',

    accent: '#21D4C2',
    accentForeground: '#071B1A',

    destructive: '#FF6B81',
    destructiveForeground: '#24060E',

    border: '#2D2548',
    input: '#31294D',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
