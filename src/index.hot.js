import {autoloadPlugins, registerPlugin} from 'block-editor-hmr'

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