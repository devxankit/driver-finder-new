module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Screens are laid out directly from the design canvas with inline styles.
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
};
