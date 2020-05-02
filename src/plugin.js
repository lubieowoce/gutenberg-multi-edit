console.info('multi-edit')

import '@wordpress/plugins'
import {addFilter, removeFilter} from '@wordpress/hooks'
import {PluginBlockSettingsMenuItem} from '@wordpress/edit-post'
import {Fragment, useEffect} from '@wordpress/element'
import {useSelect, useDispatch} from '@wordpress/data'
import {createHigherOrderComponent} from '@wordpress/compose'

import * as _ from 'lodash'

import {reregisterWithTransform} from './formats/transform-wrapper'
import './formats/indent'
import {Sidebar, SIDEBAR_NAME} from './sidebar'
import {MultiEdit} from './multi-edit'

// import './misc/wp-icons-explorer'


const MultiEditPlugin = () => {
	// if new formats are registered after this plugin, rerun the wrapper.
	const registeredFormatTypes = useSelect((select) =>
		select('core/rich-text').getFormatTypes()
	)
	useEffect(() => {
		console.info('transforming formats', registeredFormatTypes)
		const namesAndFormats = registeredFormatTypes.map((f) => [f.name, f])
		const formatTypes = _.fromPairs(namesAndFormats)
		// FORMATS_WRAP.forEach((f) =>
		namesAndFormats.forEach(([name, _f]) =>
			reregisterWithTransform(name, formatTypes)
		)
	}, [registeredFormatTypes]) // relying on reference equality (createSelector)

	// run init stuff once
	useEffect(() => {
		console.info('adding', 'multi-edit/block-toolbar')
		addFilter(
			'editor.BlockEdit',
			'multi-edit/block-toolbar',
			withMultiToolbar
		)
		return () => {
			console.info('removing', 'multi-edit/block-toolbar')
			removeFilter(
				'editor.BlockEdit',
				'multi-edit/block-toolbar'
			)
		}
	}, [])
	return <Sidebar/>
}

export const name = 'multi-edit'
export const settings = {
	render: MultiEditPlugin,
}


const withMultiToolbar = createHigherOrderComponent((BlockEdit) => ({isFakeBlockEdit = false, ...props}) => {
	// props.isSelected ? && allowedBlocks.includes( props.name )
	const {hasMultiSelection, blocks, firstId} = useSelect((select) => {
		const s = select('core/block-editor')
		return {
			hasMultiSelection: s.hasMultiSelection(),
			blocks: s.getMultiSelectedBlocks(),
			firstId: s.getFirstMultiSelectedBlockClientId()
		}
	})

	if (isFakeBlockEdit || !hasMultiSelection || props.clientId !== firstId) {
		// console.log('multi-edit/block-toolbar/render', '(skipped)')
		return (
			<BlockEdit {...props} />
		)
	}


	// console.info('multi-edit/block-toolbar/render', blocks, blocks.map((b)=>b.clientId), firstId)
	return (
		<Fragment>
			<BlockEdit {...props} />
			<WithSwitchToSidebar name={`multi-edit/${SIDEBAR_NAME}`}>
				<MultiEdit {...props} blocks={blocks} />
			</WithSwitchToSidebar>
		</Fragment>
	)
}, 'withMultiToolbar')



import {useState} from '@wordpress/element'

const WithSwitchToSidebar = ({name, children}) => {
	const {getActiveGeneralSidebarName} = useSelect((select) => select('core/edit-post'))
	const {openGeneralSidebar} = useDispatch('core/edit-post')
	const [originalSidebar,] = useState(getActiveGeneralSidebarName())

	useEffect(() => {
		// do nothing if there's no sidebar open
		if (!originalSidebar) { return }

		openGeneralSidebar(name)
		// when the component is destroyed, restore previous sidebar
		// (unless the user manually switched to another sidebar in the meantime)
		return () => {
			if (name === getActiveGeneralSidebarName()) {
				openGeneralSidebar(originalSidebar)
			}
		}
	}, [])

	return <Fragment>{children}</Fragment>
}