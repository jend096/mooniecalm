import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      colors: {
        'moon-bg': 'var(--color-bg-soft)',
        'moon-pink': 'var(--color-accent-pink)',
        'moon-peach': 'var(--color-accent-peach)',
        'moon-ink': 'var(--color-ink)'
      }
    }
  }
} satisfies Partial<Config>