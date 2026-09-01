import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const productionFiles = ['src/**/*.{ts,tsx}'];
const boundary = (files, forbidden) => ({
  files,
  rules: {
    'import/no-restricted-paths': [
      'error',
      { zones: forbidden.map((target) => ({ target: files[0].split('/**')[0], from: `./src/${target}` })) }
    ]
  }
});

export default tseslint.config(
  { ignores: ['node_modules', '../backend/target'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: productionFiles,
    plugins: { import: importPlugin, 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { project: './tsconfig.json' }, globals: globals.browser },
    settings: { 'import/resolver': { typescript: true } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  boundary(['src/domain/**'], ['application', 'infrastructure', 'presentation', 'app']),
  boundary(['src/application/**'], ['infrastructure', 'presentation', 'app']),
  boundary(['src/presentation/**'], ['infrastructure']),
  {
    files: ['src/infrastructure/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/infrastructure', from: './src/presentation' },
            { target: './src/infrastructure', from: './src/app' }
          ]
        }
      ]
    }
  },
  {
    files: ['test/**/*.{js,ts,tsx}', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
);
