module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  settings: {
    react: {
      version: 'detect',
    },
    tailwindcss: {
      callees: ['cn'],
      config: 'tailwind.config.js',
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'tailwindcss',
    'prettier',
  ],
  extends: [
    'eslint:recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:tailwindcss/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'prettier/prettier': ['error'],
    'react/self-closing-comp': ['error'],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
}
