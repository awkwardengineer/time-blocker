/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,svelte}',
    './ui-kit.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        'urbanist': ['Urbanist', 'sans-serif'],
        'gilda': ['Gilda Display', 'serif'],
      },
      fontSize: {
        // Urbanist sizes
        'lead': ['20px', { lineHeight: '30px', letterSpacing: '0%' }],
        'highlighted': ['16px', { lineHeight: '24px', letterSpacing: '0%' }],
        'subheading': ['16px', { lineHeight: '24px', letterSpacing: '0%' }],
        'body': ['16px', { lineHeight: '24px', letterSpacing: '0%' }],
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
      },
      letterSpacing: {
        'gilda-main': '5%',
        'gilda-sub': '3%',
      },
    },
  },
  plugins: [],
}

