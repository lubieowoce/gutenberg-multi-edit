/* eslint no-unused-vars: ["warn", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }] */

console.info('multi-edit')

import {createBlock} from '@wordpress/blocks'
import {registerPlugin} from '@wordpress/plugins'
import {PluginBlockSettingsMenuItem} from '@wordpress/edit-post'
import {Fragment} from '@wordpress/element'

import {useSelect, useDispatch} from '@wordpress/data'

import * as _ from 'lodash'

// import './misc/wp-icons-explorer'

const mergeParagraphs = (paragraphs, {replaceBlocks}) => {
	const ids = paragraphs.map((b) => b.clientId)
	const merged = paragraphs.map((b) => b.attributes.content).join('<br>')
	replaceBlocks(ids, [createBlock('core/paragraph', {content: merged})])
}


const STYLE = `
.multi-edit-toolbar-wrapper {
	margin-bottom: 13px;
	display: flex;
}
`


import {addFilter} from '@wordpress/hooks'
import {
	Popover,
	Toolbar,
	ToolbarButton,
} from '@wordpress/components'

import {
	NavigableToolbar,
	AlignmentToolbar,
	// BlockControls,
	// BlockFormatControls,
	// RichTextToolbarButton,
} from '@wordpress/block-editor'
// import {BlockControls} from '@wordpress/editor'
import {createHigherOrderComponent} from '@wordpress/compose'
// import {useContext, useState} from '@wordpress/element'

import * as richText from '@wordpress/rich-text'
// import * as icons from '@wordpress/icons'

import * as fmt from './format-utils'
import {FormatToolbar} from './format-toolbar'
import {MultiBlockControls} from './multi-block-controls'


const commonAttribute = (blocks, attrPath) => {
	if (blocks.length === 0) { return undefined }

	let [block,] = blocks
	const common = _.get(block, attrPath)
	for (block of blocks) {
		if (_.get(block, attrPath) !== common) {
			return [false, null]
		}
	}
	return [true, common]
}


const commonAttributes = (allAttrs) => {
	const attrs = _.cloneDeep(allAttrs[0])
	const allAttrNames = _.union(allAttrs.map(Object.keys))
	for (const attr of allAttrNames) {
		const [hasCommon, common] = commonAttribute(allAttrs, attr)
		if (hasCommon) {
			attrs[attr] = common
		} else {
			delete attrs[attr]
		}
	}
	return attrs
}

const richTextSelected = (args) => {
	const value = richText.create(args)
	value.start = 0
	value.end = value.text.length // no -1
	return value
}


const RICHTEXT_ATTRS = {
	'core/paragraph':    {attribute: 'content'},
	'core/freeform':     {attribute: 'content'},
	'core/heading':      {attribute: 'content'},
	'core/subhead':      {attribute: 'content'},
	'core/preformatted': {attribute: 'content', preserveWhiteSpace: true},
	'core/verse':        {attribute: 'content', preserveWhiteSpace: true},
	'core/quote':        {attribute: 'value',   multilineTag: 'p'},
	'core/pullquote':    {attribute: 'value',   multilineTag: 'p'},
	// 'core/list':         {attribute: 'values'},
	// 'core/quote':        ['value', 'citations'],
	// 'core/pullquote':    ['value', 'citations'],
}


import {reregisterWithTransform} from './formats/transform-wrapper'
import './formats/indent'

const FORMATS_WRAP = [
	"core/bold",
	"core/italic",
	"core/code",
	"core/strikethrough",
	"core/underline",
	"core/text-color",
	"editorskit/background",
	"editorskit/subscript",
	"editorskit/superscript",
	"editorskit/uppercase",
	// "editorskit/charmap",
]


const FORMATS_TRANSFORMS = [
 	...FORMATS_WRAP,
	"custom/indent",
]


const FORMATS_WHITELIST = [
	...FORMATS_TRANSFORMS
]





const MultiToolbar = ({blocks}) => {

	const {
		replaceBlocks,
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	} = useDispatch('core/block-editor')

	const allFormatTypes = useSelect((select) =>
		select('core/rich-text').getFormatTypes()
	)
	const allowedFormatTypes = (
		allFormatTypes.filter(({name}) => FORMATS_WHITELIST.includes(name))
	)


	const batchUpdateBlockAttributes = (updates) => {
		// will be undo-able wit a single Ctrl+Z
		// thanks to __unstableMarkNextChangeAsNotPersistent
		let first = true	
		for (const [clientId, update] of updates) {
			if (_.isEmpty(update)) { continue }
			if (first) {
				updateBlockAttributes(clientId, update) // set the undo point
				first = false
			} else {
				// won't be included in undo history - undo will just roll back
				// to the last persistent change, i.e. the first update
				__unstableMarkNextChangeAsNotPersistent()
				updateBlockAttributes(clientId, update)
			}
		}
	}

	// TODO: recurse into innerBlocks

	const setAllAttributes = (update) => (
		batchUpdateBlockAttributes(blocks.map(({clientId}) => [clientId, update]))
	)


	const [hasCommonName, maybeName] = commonAttribute(blocks, 'name')
	let multiBlockControls = null
	if (hasCommonName) {
		const name = maybeName
		const allAttrs = blocks.map((b) => b.attributes)
		const commonAttrs = commonAttributes(allAttrs)
		multiBlockControls = (
			<MultiBlockControls
				blockName={name}
				attributes={commonAttrs}
				setAttributes={setAllAttributes}
				instanceBlock={blocks[0]}
			/>
		)
	}


	const [hasCommonAlign, maybeAlign] = commonAttribute(blocks, ['attributes', 'align'])
	const align = hasCommonAlign ? maybeAlign : null
	const setAligns = (newAlign) => {
		const update = {align: newAlign}
		batchUpdateBlockAttributes(
			blocks.map((b) => [b.clientId, update])
		)
	}
	
	const blockMaybeTexts = blocks.map(({name, attributes}) => {
		const attr = RICHTEXT_ATTRS[name]
		if (!attr) { return null }
		const {attribute, ...options} = attr
		return richTextSelected({html: attributes[attribute], ...options})
	})

	const anyRichTexts = blockMaybeTexts.some(Boolean)
	let commonFormats
	if (anyRichTexts) {
		commonFormats = fmt.commonActiveFormats(allowedFormatTypes, blockMaybeTexts.filter(Boolean))
	} else {
		commonFormats = null
	}
	// console.info('commonFormats', commonFormats)
	// console.info('dummyText', dummyText, richText.toHTMLString({value: dummyText}))

	const onTransformReady = (transform) => {
		batchUpdateBlockAttributes(
			_.zip(blocks, blockMaybeTexts)
			.map(([block, text]) => {
				if (!text) { return null }
				text = transform(text)
				const {attribute, ...options} = RICHTEXT_ATTRS[block.name]
				return [
					block.clientId,
					{ [attribute]: richText.toHTMLString({value: text, ...options}) }
				]
			})
			.filter(Boolean)
		)
	}

	const onClearFormatting = () => {
		batchUpdateBlockAttributes(
			_.zip(blocks, blockMaybeTexts)
			.map(([block, text]) => {
				if (!text) { return null }
				const {attribute, ...options} = RICHTEXT_ATTRS[block.name]
				// TODO:
				// keep replacement objects like links - they're not really formatting.
				// could be done by looping over all formats
				// and removing the ones that don't have a .object property
				const plain = richText.getTextContent(text)
				text = richTextSelected({text: plain, ...options})
				return [
					block.clientId,
					{ [attribute]: richText.toHTMLString({value: text, ...options}) }
				]
			})
			.filter(Boolean)
		)
	}


	return (
		<Popover
			noArrow 
			animate = {true}
			position = 'top left right' // Y X corner 
			// position = 'top right left'
			focusOnMount = {false}
			// anchorRef anchorRef,
			className = "block-editor-block-list__block-popover"
			// __unstableSticky ! showEmptyBlockSideInserter,
			__unstableSlotName = "block-toolbar"
			// __unstableSticky true,
			// __unstableBoundaryParent true,
		>

			<NavigableToolbar className="multi-edit-toolbar-wrapper" aria-label='Multi-Edit Tools'>

				<Toolbar>
					<ToolbarButton 
						title = {`Merge ${blocks.length} blocks`}
						icon = 'editor-insertmore'
						// isActive = {blocks.every((b) => b.name === 'core/paragraph')}
						isDisabled = {blocks.some((b) => b.name !== 'core/paragraph')}
						onClick = {() => mergeParagraphs(blocks, {replaceBlocks})}
					/>
				</Toolbar>
				
				{ multiBlockControls }


				<AlignmentToolbar
					value={align}
					onChange={setAligns}
				/>

				{ anyRichTexts &&
					<Fragment>
					<FormatToolbar
						formatTypes={allowedFormatTypes}
						activeFormats={_.fromPairs(commonFormats.map((f)=>[f.type, f]))}
						onTransformReady={onTransformReady}
						controls={[{
							icon: "editor-removeformatting",
							title: "Clear Formatting",
							onClick: onClearFormatting,
						}]}
					/>
					</Fragment>
				}

			</NavigableToolbar>

		</Popover>
	)
}


// import {__experimentalUseSlot as useSlot} from '@wordpress/components'
import {useEffect} from '@wordpress/element'

const MultiEditPlugin = () => {

	// if new formats are registered after this plugin, rerun the wrapper.
	const registeredFormatTypes = useSelect((select) =>
		select('core/rich-text').getFormatTypes()
	)
	useEffect(() => {
		console.info('transforming formats', registeredFormatTypes)
		const formatTypes = _.fromPairs(registeredFormatTypes.map((f) => [f.name, f]))
		FORMATS_WRAP.forEach((f) =>
			reregisterWithTransform(f, formatTypes)
		)
	}, [registeredFormatTypes]) // relying on reference equality (createSelector)

	// run init stuff once
	useEffect(() => {
		addFilter(
			'editor.BlockEdit',
			'multi-edit/block-toolbar',
			withMultiToolbar
		)

		const styleNode = document.createElement('style')
		styleNode.id = 'multi-edit__styles'
		styleNode.innerText = STYLE
		document.head.appendChild(styleNode)
	}, [])
	return null
}

registerPlugin('multi-edit', {
	render: MultiEditPlugin,
})


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
			<MultiToolbar {...props} blocks={blocks} />
		</Fragment>
	)
}, 'withMultiToolbar')

