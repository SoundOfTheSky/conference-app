module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    parser: 'babel-eslint',
    sourceType: 'module',
  },
  plugins: ['html', 'prettier'],
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  env: { browser: true, node: true, es2020: true },
  rules: {
    'no-unused-vars': 'warn',
    'prettier/prettier': 'warn',
  },
};
