import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * Flat config for a TypeScript + React app.
 *
 * The scaffold shipped a JS-only config, which meant `eslint .` matched nothing in
 * a src/ directory of .ts and .tsx files - a lint script that passes by having
 * nothing to lint is worse than no lint script.
 *
 * Type-aware rules are on (projectService), because the rules worth having here -
 * no-floating-promises above all - need the type checker. This app fires exactly
 * one write request, and an unawaited promise around it is precisely the class of
 * bug that turns "the order failed" into a silent success.
 */
export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Unused args are fine when they document a signature, as long as they are
      // marked. Matches the tsconfig's noUnusedParameters allowance.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `void promise` is the app's explicit "fire and forget, deliberately" marker
      // and appears in query invalidations throughout. Bare calls stay errors.
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      // Off deliberately. This codebase colocates a provider with its hook
      // (useCheckoutSession, AppShell/useNav) and a status component with its
      // presentation map (OrderStatus) - idiomatic React that this Fast-Refresh
      // ergonomics rule cannot express. It only affects HMR granularity in dev,
      // never correctness, so the convention wins over the rule.
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // vite.config.ts and this file run in Node, not the browser.
    files: ['*.config.{ts,js}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
]);
