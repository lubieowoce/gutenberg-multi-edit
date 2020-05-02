// note: HMR requires using webpack-dev-derver, so it won't work with the default
// `wp-scripts start` - we have to do `webpack-dev-server` instead.

const {HotModuleReplacementPlugin} = require('webpack');

const config = require(
	'./webpack.common.js'
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

	// HMR won't work without this
	plugins: [
		new HotModuleReplacementPlugin(),
	],
};


module.exports = {
	...config,
	...devHMR,
	entry: {
		...config.entry,
		index: './src/index.hot.js',
	},
	output: {
		...config.output,
		...devHMR.output,		
	},
	plugins: [
		...config.plugins.filter((p) =>
			p.constructor.name !== 'LiveReloadPlugin'
		),
		...devHMR.plugins,
	],
};