/**
 * ESLint configuration.
 *
 * Kept deliberately small: the rules that catch real bugs (unused variables,
 * undefined identifiers, missing hook dependencies) on top of the React
 * recommended set. Styling is not linted - there is no formatter in this
 * project, so a rule that only rearranges whitespace would just be noise.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'node_modules', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'],
  rules: {
    // Props are documented in the components themselves; prop-types would double
    // the size of every file to restate what the JSX already says.
    'react/prop-types': 'off',

    /**
     * Off on purpose. The context modules legitimately export a provider
     * component AND a `useX()` hook from the same file, which this rule reads as
     * a Fast Refresh violation.
     */
    'react-refresh/only-export-components': 'off',

    // Allow deliberately-unused parameters prefixed with an underscore.
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
};
