import {autoloadPlugins} from 'block-editor-hmr'

import './editor.css'

import './formats/indent'
// import './misc/wp-icons-explorer'

autoloadPlugins(
	{
		// Return a project-specific require.context.
		getContext: () => require.context('.', true, /plugin\.js$/),
	},
	(context, loadModules) => {
		if (module.hot) {
			module.hot.accept(context.id, loadModules)
		}
	}
)

