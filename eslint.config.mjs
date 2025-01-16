import globals from "globals";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
       // ported from env/config to new flat format; 
       // @see: https://eslint.org/docs/latest/use/configure/migration-guide#configuring-language-options
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // retained all rules previously defined

      // no-dupe-keys crashes with recent eslint. See
      // overriding recommended rules.
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-console': ['error', { allow: ['log', 'warn', 'error'] }],
      "no-unused-vars": "off",
      // This rule checks for the unused variables and arguments now, but doesn't error on pure type definitions.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: '^_' }],
      // This rule gets confused with async functions and setting the
      // ctx for route responses.
      'require-atomic-updates': 0,

      // possible errors
      'array-callback-return': 'error',
      'consistent-return': 'error',
      'default-case': 'error',
      'dot-notation': 'error',
      eqeqeq: 'error',
      'for-direction': 'error',
      'no-alert': 'error',
      'no-caller': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-label': 'error',
      'no-implied-eval': 'error',
      'no-invalid-this': 'error',
      'no-return-await': 'error',
      'no-self-compare': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'no-void': 'error',
      'no-with': 'error',
      'prefer-const': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'no-else-return': 'error',
    }
  }
);
