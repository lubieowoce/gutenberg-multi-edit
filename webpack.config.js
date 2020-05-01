const config = require(
	'@wordpress/scripts/config/webpack.config.js'
);
const MiniCSSExtract = require('mini-css-extract-plugin');
const IgnoreEmit = require('ignore-emit-webpack-plugin');

module.exports = {
	...config,
	entry: {
		...config.entry,
		editor: './src/editor.css',
	},
	module: {
		...config.module,
		rules: [
			...config.module.rules,
			{
				test: /\.css$/i,
				exclude: /node_modules/,
				use: [
					MiniCSSExtract.loader,
					'css-loader'
				],
			},
		],
	},
	plugins: [
		...config.plugins,
		new MiniCSSExtract(),
		new IgnoreEmit(['editor.js']),
	],
};