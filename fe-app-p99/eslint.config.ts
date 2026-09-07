// eslint.config.ts
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['node_modules', 'watch-upload.ts'],
    },
    {
        files: ['src/**/*.test.ts'],
        languageOptions: {
            globals: {
                Buffer: 'readonly',
                URL: 'readonly',
            },
        },
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: 'off',
        },
        rules: {
            'no-console': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'off',
            'prefer-rest-params': 'off',
        },
    },
    prettier,
];
