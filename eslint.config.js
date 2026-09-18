import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import unusedImports from 'eslint-plugin-unused-imports';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  { ignores: ['dist', 'node_modules', 'public', '*.config.js', '*.config.ts'] },

  // ─── JavaScript / JSX: what has not been migrated to TypeScript yet ────────
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.serviceworker },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': reactHooks, 'react-refresh': reactRefresh, 'unused-imports': unusedImports },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      // Prop shapes are being moved to TypeScript file by file (T4.5); runtime
      // PropTypes would be a second, drifting copy of the same contract.
      'react/prop-types': 'off',
      'unused-imports/no-unused-imports': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Diagnostics go through src/lib/logger.ts, which stays quiet in production.
      'no-console': 'error',
    },
  },

  // ─── TypeScript / TSX ──────────────────────────────────────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.serviceworker },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
      jsdoc,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // TypeScript owns undefined-symbol and redeclare checks.
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
      'no-dupe-class-members': 'off',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unused-vars': 'off',

      // `any` hides contract drift between the API and the UI.
      '@typescript-eslint/no-explicit-any': 'error',
      'prefer-const': 'error',
      'no-console': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ─── Services, hooks and libs are the app's API surface ────────────────────
  {
    files: ['src/services/**/*.ts', 'src/hooks/**/*.ts', 'src/lib/*.ts'],
    plugins: { jsdoc },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
            MethodDefinition: true,
          },
          contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'],
        },
      ],
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns-description': 'error',
    },
  },

  // ─── Tests, the logger and the service worker may use the console ─────────
  {
    files: ['**/*.test.{ts,tsx}', 'src/test-utils/**', 'src/lib/logger.ts', 'public/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },
];
