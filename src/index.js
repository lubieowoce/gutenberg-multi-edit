/* eslint no-unused-vars: ["warn", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }] */

console.info('multi-edit')

import {createBlock} from '@wordpress/blocks'
import {registerPlugin} from '@wordpress/plugins'
import {PluginBlockSettingsMenuItem} from '@wordpress/edit-post'

import {useSelect, useDispatch} from '@wordpress/data'

import {Fragment} from '@wordpress/element'

import * as _ from 'lodash'


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
	BlockControls,
	BlockFormatControls,
	RichTextToolbarButton,
} from '@wordpress/block-editor'
// import {BlockControls} from '@wordpress/editor'
import {createHigherOrderComponent} from '@wordpress/compose'
import {useContext, useState} from '@wordpress/element'

import {__unstableFormatEdit as FormatEdit} from '@wordpress/rich-text'
import * as richText from '@wordpress/rich-text'

import {FormatToolbar} from './format-toolbar'
import * as fmt from './format-utils'


const commonAttribute = (blocks, attr) => {
	if (blocks.length === 0) { return undefined }

	let [block,] = blocks
	const common = block.attributes[attr]
	for (block of blocks) {
		if (block.attributes[attr] !== common) {
			return [false, null]
		}
	}
	return [true, common]
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

// tricky so let's just disable them for now
const DISABLED_FORMATS = [
	'core/image',
	'core/link',
]

const MultiToolbar = ({blocks}) => {

	const {
		replaceBlocks,
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	} = useDispatch('core/block-editor')

	const coreFormatTypes = useSelect((select) =>
		select('core/rich-text').getFormatTypes()
	).filter(({name}) => name.match(/^core\//) && !DISABLED_FORMATS.includes(name))


	const [hasCommonAlign, maybeAlign] = commonAttribute(blocks, 'align')
	const align = hasCommonAlign ? maybeAlign : null
	const setAligns = (newAlign) => {
		for (const [i, block] of blocks.entries()) {
			if (i > 0) {
				__unstableMarkNextChangeAsNotPersistent()
			}
			updateBlockAttributes(block.clientId, {align: newAlign})
		}
	}
	
	const blockMaybeTexts = blocks.map(({name, attributes}) => {
		const attr = RICHTEXT_ATTRS[name]
		if (!attr) { return null }
		const {attribute, ...options} = attr
		return richTextSelected({html: attributes[attribute], ...options})
	})

	const anyRichTexts = blockMaybeTexts.some(Boolean)
	let commonFormats, dummyText
	if (anyRichTexts) {
		commonFormats = fmt.commonActiveFormats(coreFormatTypes, blockMaybeTexts.filter(Boolean))
		dummyText = fmt.applyFormats(richTextSelected({text: 'dummy'}), commonFormats)	
	} else {
		commonFormats = null
		dummyText = null
	}
	console.info('commonFormats', commonFormats)
	// console.info('dummyText', dummyText, richText.toHTMLString({value: dummyText}))

	const applyNewFormats = (newDummyText) => {
		console.info('newDummyText', newDummyText, richText.toHTMLString({value: newDummyText}))
		// const oldActive = dummyText.activeFormats || []
		// const newActive = newDummyText.activeFormats || []
		const oldActive = fmt.activeFormats(coreFormatTypes, dummyText)
		const newActive = fmt.activeFormats(coreFormatTypes, newDummyText)

		const added   = fmt.formatsSubtract(newActive, oldActive)
		const removed = fmt.formatsSubtract(oldActive, newActive)
		console.info('added', added)
		console.info('removed', removed)

		if (_.isEmpty(added) && _.isEmpty(removed)) {
			return
		}

		for (let [i, [block, text]] of _.zip(blocks, blockMaybeTexts).entries()) {
			if (!text) { continue }
			text = removed.reduce(fmt.removeExactFormat, text)
			text = fmt.applyFormats(text, added)
			// console.info('updating', block.clientId, {content: richText.toHTMLString({value: text})}) 
			const {attribute, ...options} = RICHTEXT_ATTRS[block.name]
			if (i > 0) {
				__unstableMarkNextChangeAsNotPersistent()
			}
			updateBlockAttributes(block.clientId, {
				[attribute]: richText.toHTMLString({value: text, ...options})
			})
		}
	}

	const clearFormatting = () => {
		for (let [i, [block, text]] of _.zip(blocks, blockMaybeTexts).entries()) {
			if (!text) { continue }
			const {attribute, ...options} = RICHTEXT_ATTRS[block.name]
			const plain = richText.getTextContent(text)
			text = richTextSelected({text: plain, ...options})

			if (i > 0) {
				__unstableMarkNextChangeAsNotPersistent()
			}
			updateBlockAttributes(block.clientId, {
				[attribute]: richText.toHTMLString({value: text, ...options})
			})
		}
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

				<AlignmentToolbar
					value={align}
					onChange={setAligns}
				/>

				{ anyRichTexts &&
					<Fragment>
						<FormatToolbar/>
						<FormatEdit
							value={dummyText}
							formatTypes={coreFormatTypes}
							onChange={applyNewFormats}
							onFocus={_.noop}
						/>
						<RichTextToolbarButton
							icon="editor-removeformatting"
							title="Clear Formatting"
							onClick={() => clearFormatting()}
							isActive={false}
						/>
					</Fragment>
				}
			</NavigableToolbar>

		</Popover>
	)
}



const withMultiToolbar = createHigherOrderComponent((BlockEdit) => (props) => {
	// props.isSelected ? && allowedBlocks.includes( props.name )
	const {hasMultiSelection, blocks, firstId} = useSelect((select) => {
		const s = select('core/block-editor')
		return {
			hasMultiSelection: s.hasMultiSelection(),
			blocks: s.getMultiSelectedBlocks(),
			firstId: s.getFirstMultiSelectedBlockClientId()
		}
	})

	if (!hasMultiSelection || props.clientId !== firstId) {
		// console.log('multi-edit/block-toolbar/render', '(skipped)')
		return (
			<BlockEdit {...props} />
		)
	}
	console.info('multi-edit/block-toolbar/render', blocks, blocks.map((b)=>b.clientId), firstId)
	return (
		<Fragment>
			<BlockEdit {...props} />
			<MultiToolbar {...props} blocks={blocks} />
		</Fragment>
	)
}, 'withMultiToolbar')


addFilter(
	'editor.BlockEdit',
	'multi-edit/block-toolbar',
	withMultiToolbar
)

const styleNode = document.createElement('style')
styleNode.innerText = STYLE
document.head.appendChild(styleNode)
