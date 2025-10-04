import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsonc from 'eslint-plugin-jsonc'
import { defineConfig, globalIgnores } from 'eslint/config'

const packageJsonConfigs = jsonc.configs['flat/recommended-with-json'].map((config) => {
  if (!config.files) {
    return config
  }

  return {
    ...config,
    files: ['**/package.json'],
    rules: {
      ...config.rules,
      'jsonc/indent': ['error', 2],      // enforce 2-space indentation
      'jsonc/sort-keys': [
        'error',
        {
          pathPattern: '^$\\.',
          order: [
            'name',
            'version',
            'private',
            'type',
            'description',
            'scripts',
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'lint-staged',
          ],
        },
      ],
    },
  }
})

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  ...packageJsonConfigs,
])
