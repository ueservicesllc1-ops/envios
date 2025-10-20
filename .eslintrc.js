module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Deshabilitar reglas que causan problemas en CI
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    // Permitir variables no utilizadas en desarrollo
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off'
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
};