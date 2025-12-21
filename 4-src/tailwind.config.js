/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,svelte}',
    './ui-kit.html'
  ],
  safelist: [
    'hover:bg-grey-20',
    'hover:bg-grey-30',
    'hover:bg-grey-40',
    'hover:underline',
  ],
  theme: {
    extend: {
      fontFamily: {
        'urbanist': ['Urbanist', 'sans-serif'],
        'gilda': ['Gilda Display', 'serif'],
        'allura': ['Allura', 'cursive'],
      },
      fontSize: {
        // Urbanist sizes
        'lead': ['20px', { lineHeight: '30px', letterSpacing: '0%' }],
        'highlighted': ['16px', { lineHeight: '24px', letterSpacing: '0%' }],
        'subheading': ['16px', { lineHeight: '24px', letterSpacing: '0%' }],
        'body': ['16px', { lineHeight: '14px', letterSpacing: '0%' }],
        'body-medium': ['14px', { lineHeight: '20px', letterSpacing: '0%' }],
        'body-small': ['14px', { lineHeight: '20px', letterSpacing: '0%' }],
        'card': ['12px', { lineHeight: '14px', letterSpacing: '0%' }],
        'label': ['12px', { lineHeight: '14px', letterSpacing: '0%' }],
        'caption': ['12px', { lineHeight: '14px', letterSpacing: '0%' }],
        'micro': ['10px', { lineHeight: '12px', letterSpacing: '0%' }],
        // Gilda Display sizes
        'hero': ['32px', { lineHeight: '43px', letterSpacing: '0%' }],
        'main-heading': ['24px', { lineHeight: '20px', letterSpacing: '5%' }],
        'gilda-subheading': ['18px', { lineHeight: '20px', letterSpacing: '3%' }],
        'section-title': ['16px', { lineHeight: '24px', letterSpacing: '0%' }],
        'minor-heading': ['14px', { lineHeight: '20px', letterSpacing: '0%' }],
        // Allura decorative sizes
        'decorative-large': ['100px', { lineHeight: '135px', letterSpacing: '0%' }],
        'decorative-medium': ['20px', { lineHeight: '26px', letterSpacing: '3%' }],
        'decorative-small': ['16px', { lineHeight: '20.8px', letterSpacing: '3%' }],
      },
      letterSpacing: {
        'gilda-main': '0.05em',
        'gilda-sub': '0.03em',
        'allura': '0.03em',
      },
      colors: {
        grey: {
          10: '#FCFCFC',  // White
          20: '#F0F0EE',  // Light Gray
          30: '#EBEBE5',  // Pastel
          40: '#D9D9D2',  // Quill Gray
          50: '#DBDBD5',  // Light Beige
          60: '#BCBCBC',  // Gray
          70: '#BFBEBB',  // Silver
          80: '#B6B6B0',  // Cotton Seed
          90: '#AAA4A4',  // Shady Lady
          100: '#757373', // Dark Gray
          110: '#323232', // Black
        },
        orange: {
          500: '#F6921E', // Carrot Orange
        },
        red: {
          500: '#FF6B6B', // Carnation
        },
        blue: {
          500: '#6B8FD9', // Soft muted blue for focus rings
        },
      },
    },
  },
  plugins: [],
}

