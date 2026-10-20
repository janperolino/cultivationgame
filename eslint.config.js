import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

// src/core and src/content stay free of React, the UI and the AI layer, so the Node sims and
// tests can import them. src/core also never touches the network.
const layerImports = {
  patterns: [
    {
      regex: '^react(-dom)?(/|$)',
      message: 'src/core and src/content must not import React.',
    },
    {
      regex: '(^|/)(ui|ai)(/|$)',
      message: 'src/core and src/content must not import src/ui or src/ai.',
    },
  ],
};
const noNetwork = 'src/core never calls the network.';
// Time and randomness come into src/core as inputs, so a seed replays the same life and tests
// and sims control the clock.
const noClock = 'src/core takes the time as an input; pass `now` in.';
const noRandom = 'src/core draws from a named seeded stream (core/rng.ts), never Math.random.';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'tools/atlas', 'src/content/generated', '.claude'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['src/core/**', 'src/content/**'],
    rules: { 'no-restricted-imports': ['error', layerImports] },
  },
  {
    files: ['src/core/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: noNetwork },
        { name: 'XMLHttpRequest', message: noNetwork },
        { name: 'WebSocket', message: noNetwork },
        { name: 'EventSource', message: noNetwork },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'globalThis', property: 'fetch', message: noNetwork },
        { object: 'window', property: 'fetch', message: noNetwork },
        { object: 'self', property: 'fetch', message: noNetwork },
        { object: 'Math', property: 'random', message: noRandom },
        { object: 'Date', property: 'now', message: noClock },
        { object: 'performance', property: 'now', message: noClock },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: noClock },
        { selector: "CallExpression[callee.name='Date'][arguments.length=0]", message: noClock },
      ],
    },
  },
  prettier,
);
