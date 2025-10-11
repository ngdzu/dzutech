import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsonc from 'eslint-plugin-jsonc'
import markdown from '@eslint/markdown'
import yml from 'eslint-plugin-yml'
import { defineConfig, globalIgnores } from 'eslint/config'

const [jsoncBaseConfig, ...jsoncFileConfigs] = jsonc.configs['flat/recommended-with-json']

const jsonFileGlobs = [
  '*.json',
  '**/*.json',
  '*.json5',
  '**/*.json5',
  '*.jsonc',
  '**/*.jsonc',
]

const packageJsonConfigs = jsoncFileConfigs.map((config) => ({
  ...config,
  files: ['**/package.json'],
  rules: {
    ...config.rules,
    'jsonc/indent': ['error', 2],
    'jsonc/sort-keys': [
      'error',
      {
        pathPattern: '^$\.',
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
}))

const jsonConfigFiles = jsoncFileConfigs.map((config) => ({
  ...config,
  files: jsonFileGlobs,
  ignores: [...(config.ignores ?? []), '**/package.json'],
  rules: {
    ...config.rules,
    'jsonc/indent': ['error', 2],
    'jsonc/no-comments': 'off',
  },
}))

const ymlConfigs = (() => {
  const [ymlBaseConfig, ...ymlFileConfigs] = yml.configs['flat/recommended']
  return [
    ymlBaseConfig,
    ...ymlFileConfigs.map((config) => ({
      ...config,
      files: ['**/*.{yml,yaml}'],
    })),
  ]
})()

const markdownConfig = markdown.configs.recommended

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'server/dist', 'server/coverage', 'server/coverage/**', '.github']),
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
  // enforce stricter rules for test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'server/src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  jsoncBaseConfig,
  ...jsonConfigFiles,
  ...packageJsonConfigs,
  ...ymlConfigs,
  ...markdownConfig,
])
