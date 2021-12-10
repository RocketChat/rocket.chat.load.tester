module.exports = {
  extends: '@rocket.chat/eslint-config-alt/typescript',
  env: {
    jest: true,
  },
  overrides: [
    {
      files: [
        "**/*.ts",
        "**/*.tsx"
      ],
      rules: {
        "@typescript-eslint/indent": [
          "off"
        ],
      }
    }
  ],
};
