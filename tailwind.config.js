/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontSize: {
        // Override các class nhỏ hơn 16px → tất cả min 16px
        xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px → 16px (1.33)
        sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px → 20px (1.43)
        base: ['1rem', { lineHeight: '1.5rem' }],     // 16px → 24px (1.5)
      },
    },
  },
  plugins: [],
}
