const MiniCSSExtract = require('mini-css-extract-plugin');
const IgnoreEmit = require('ignore-emit-webpack-plugin');

const config = require(
	'@wordpress/scripts/config/webpack.config.js'
);

const styles = {
	entry: {
		editor: './src/editor.css',
	},
	module: {
		rules: [
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
		new MiniCSSExtract(),
		new IgnoreEmit(['editor.js']),
	],
}


module.exports = {
	...config,
	...styles,
	entry: {
		...config.entry,
		...styles.entry,		
	},
	module: {
		...config.module,
		...styles.module,
		rules: [
			...config.module.rules,
			...styles.module.rules,
		],
	},
	plugins: [
		...config.plugins,
		...styles.plugins,
	],
};