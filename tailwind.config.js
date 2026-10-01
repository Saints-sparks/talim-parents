/** @type {import('tailwindcss').Config} */

/**
 * A colour read from a `--tl-*` channel triplet ("r g b") in `src/index.css`,
 * so opacity modifiers (`bg-tl-brand/10`) keep working and the value switches
 * with the dark theme.
 *
 * @param {string} name - The token name without the `--tl-` prefix.
 * @returns {string} The Tailwind colour value.
 */
const token = (name) => `rgb(var(--tl-${name}) / <alpha-value>)`;

const TL_TOKENS = [
  'bg', 'surface', 'subtle', 'ink', 'body', 'muted', 'faint', 'line', 'line-soft', 'control',
  'brand', 'brand-fill', 'brand-fill-hover', 'on-brand', 'link', 'select', 'track', 'badge',
  'success', 'success-bg', 'warning', 'warning-bg', 'danger', 'danger-bg', 'info', 'info-bg',
  'accent', 'accent-bg',
];

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        geistSans: ['var(--font-geist-sans)'],
        geistMono: ['var(--font-geist-mono)'],
        manrope: ['var(--font-manrope)'],
      },
      colors: {
        // The redesign's palette (Talim Parent Portal.dc.html), as tokens that
        // switch with the theme. Every text/surface pair clears WCAG AA.
        tl: Object.fromEntries(TL_TOKENS.map((name) => [name, token(name)])),
        // The current subject or avatar tone, set by a `.tl-tone-*` class on
        // the element or an ancestor.
        tone: {
          bg: 'rgb(var(--tone-bg) / <alpha-value>)',
          fg: 'rgb(var(--tone-fg) / <alpha-value>)',
          solid: 'rgb(var(--tone-solid) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
