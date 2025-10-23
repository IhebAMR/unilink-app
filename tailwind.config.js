/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-dark': 'var(--primary-dark)',
        'primary-light': 'var(--primary-light)',
      },
      backgroundColor: {
        'bg': 'var(--bg)',
        'bg-alt': 'var(--bg-alt)',
      },
      textColor: {
        'text': 'var(--text)',
        'text-muted': 'var(--text-muted)',
      },
      borderColor: {
        'border': 'var(--border)',
      },
      borderRadius: {
        'radius': 'var(--radius)',
        'radius-sm': 'var(--radius-sm)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow)',
        'lg': 'var(--shadow-lg)',
      },
      maxWidth: {
        'container': 'var(--container-max)',
      },
      fontSize: {
        'xs': 'var(--fs-xs)',
        'sm': 'var(--fs-sm)',
        'base': 'var(--fs-md)',
        'lg': 'var(--fs-lg)',
        'xl': 'var(--fs-xl)',
        '2xl': 'var(--fs-2xl)',
      },
    },
  },
  plugins: [],
}
