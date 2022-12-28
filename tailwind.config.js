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
        '128': '32rem',
        '142': '42rem',
    }},
  },
  plugins: [],
}
