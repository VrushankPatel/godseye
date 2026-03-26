import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '.cache/**',
      'dist/**',
      'node_modules/**',
      '.research/**',
      'public/**',
    ],
  },
  {
    files: [
      'src/**/*.{js,jsx}',
      'scripts/**/*.{js,mjs}',
      'tests/**/*.{js,mjs}',
      'vite.config.js',
      'vitest.config.js',
      'playwright.config.js',
      'eslint.config.js',
    ],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^(React|_)',
        ignoreRestSiblings: true,
        caughtErrors: 'none',
      }],
    },
  },
];
