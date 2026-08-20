import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// Flat config. Plugins are registered explicitly as objects (ESLint 10 rejects
// the legacy `plugins: ['name']` array form that some plugin presets still ship
// via `extends`), and their recommended rules are applied by name.
export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'reports', 'playwright-report', 'test-results'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // The store context module intentionally co-exports its provider component
    // and the hooks that read it; the Fast-Refresh "only export components"
    // warning does not apply to a context/binding module like this.
    files: ['**/DecisionStoreContext.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
