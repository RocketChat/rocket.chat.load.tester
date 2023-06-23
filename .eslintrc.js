module.exports = {
	extends: '@rocket.chat/eslint-config-alt/typescript',
	env: {
		jest: true,
	},
	overrides: [
		{
			files: ['**/*.ts', '**/*.tsx'],
			rules: {
				'@typescript-eslint/indent': ['off'],
				"@typescript-eslint/no-misused-promises": [
					"error",
					{
						"checksVoidReturn": {
							"arguments": false
						}
					}
				],
				"@typescript-eslint/no-floating-promises": "error",
			},
			"parserOptions": {
				"project": ["./tsconfig.json"]
			},
		},
	],
};
