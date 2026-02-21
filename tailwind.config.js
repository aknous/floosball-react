const defaultTheme = require('tailwindcss/defaultTheme')
module.exports = {
  content: ["./src/**/*.js"],
  theme: {
    screens: {
      'phone': '280px',
      // => @media (min-width: 280px) { ... }

      'tablet': '640px',
      // => @media (min-width: 640px) { ... }

      'laptop': '1280px',
      // => @media (min-width: 1280px) { ... }

      'desktop': '1920px',
      // => @media (min-width: 1920px) { ... }
    },
    extend: {
      spacing: {
        '88': '22rem',
        '100': '28rem',
        '112': '30rem',
        '128': '32rem',
        '138': '38rem',
        '140': '40rem',
        '142': '42rem',
        '144': '44rem',
        '146': '46rem',
        '148': '48rem',
        '150': '50rem',
        '152': '52rem',
        '154': '54rem',
        '155': '55rem',
        '156': '56rem',
        '158': '58rem',
        '160': '60rem',
        '162': '62rem',
        '164': '64rem',
      },
      fontSize: {
        '2xs': ['10px', '22px'],
      }
  },
    fontFamily: {
      pixel: ['pressStart', ...defaultTheme.fontFamily.sans],
   },
  },
  plugins: [],
}
