// note: HMR requires using webpack-dev-derver, so it won't work with the default
// `wp-scripts start` - we have to do `webpack-dev-server` instead.

const {HotModuleReplacementPlugin} = require('webpack');

const config = require(
	'@wordpress/scripts/config/webpack.config.js'
);

const port = parseInt(process.env.PORT, 10) || 3030;
const publicPath = `http://localhost:${port}/`;

const devHMR = {
	mode: 'development',

	// important! tell webpack where it can find the *.hot-update.* files
	output: {
		publicPath,
	},

	devServer: {
		hotOnly: true,
		port,

		// if the dev server runs on a different host than the site
		disableHostCheck: true,
		headers: {
			'Access-Control-Allow-Origin': '*',
		},
		
		// if we want to upload the compiled code to the site (via FTP or sth)
		writeToDisk: true,

		watchOptions: {
			aggregateTimeout: 300,
		},
		stats: {
			all: false,
			assets: true,
			colors: true,
			errors: true,
			performance: true,
			timings: true,
			warnings: true,
		},
	},

	// hot-load css with style-loader instead of MiniCSSExtractPlugin
	module: {
		rules: [
			{
				test: /\.css$/i,
				exclude: /node_modules/,
				use: [
					'style-loader',
					'css-loader',
				],
			},
		],		
	},

	// HMR won't work without this
	plugins: [
		new HotModuleReplacementPlugin(),
	],
};

const disabledPlugins = [
	'LiveReloadPlugin',
	// 'IgnoreEmitPlugin',
]

module.exports = {
	...config,
	...devHMR,
	entry: {
		// ...config.entry,
		index: './src/index.hot.js',
	},
	output: {
		...config.output,
		...devHMR.output,
	},
	module: {
		...config.module,
		...devHMR.module,
		rules: [
			...config.module.rules,
			...devHMR.module.rules,
		],
	},
	plugins: [
		...config.plugins.filter((p) =>
			!disabledPlugins.includes(typeof p === 'object' ? p.constructor.name : p)
		),
		...devHMR.plugins,
	],
};