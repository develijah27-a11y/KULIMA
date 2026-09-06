import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      'scripts/**',
      '*.config.js',
      '*.config.mjs',
      '*.setup.js',
      '*.setup.ts',
    ],
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'react-hooks': {
        rules: {
          'exhaustive-deps': { create: () => ({}) },
        },
      },
      '@next/next': {
        rules: {
          'no-img-element': { create: () => ({}) },
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  }
);
