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

// import {__unstableFormatEdit as FormatEdit} from '@wordpress/rich-text'
import * as richText from '@wordpress/rich-text'
import * as icons from '@wordpress/icons'

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

window.wp.domReady(() => {
	FORMATS_WRAP.forEach(reregisterWithTransform)
})


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

	const allowedFormatTypes = useSelect((select) =>
		select('core/rich-text').getFormatTypes()
	).filter(({name}) => FORMATS_WHITELIST.includes(name))


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

	const [hasCommonAlign, maybeAlign] = commonAttribute(blocks, 'align')
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
	console.info('commonFormats', commonFormats)
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

				<AlignmentToolbar
					value={align}
					onChange={setAligns}
				/>

				{ anyRichTexts &&
					<Fragment>
						<FormatToolbar
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





import { __ } from '@wordpress/i18n';
import { DropdownMenu, Button, Slot } from '@wordpress/components';

const MORE_FORMATS_POPOVER_PROPS = {
	position: 'bottom right',
	isAlternate: true,
};

const FORMATS_PRIMARY = ['core/bold', 'core/italic', 'core/text-color']

const FormatToolbar = ({activeFormats, onTransformReady, controls: extraControls}) => {
	const {getFormatType} = useSelect((select) => select('core/rich-text'))

	return (
		<div className="block-editor-format-toolbar">
			<Toolbar>
				{
					// instantiate the controls that use RichTextToolbarButton
					// i.e. the 'RichText.ToolbarControls' fill
					// the slot is provided right below
					FORMATS_TRANSFORMS.map((formatId) => {
						const formatType = getFormatType(formatId)
						if (!formatType) { return null }
						const isActive = formatId in activeFormats
						const activeAttributes = isActive ? (activeFormats[formatId].attributes || {}) : {}
						// eslint-disable-next-line @wordpress/no-unused-vars-before-return
						const {getTransform: GetTransform} = formatType
						return (
							<GetTransform
								formatId={formatId}
								key={formatId}
								isActive={isActive}
								activeAttributes={activeAttributes}
								onTransformReady={onTransformReady}
							/>
						)
					  }).map((el, i) => {console.info('GetTransform', i, el); return el})
				}
				{
					// FORMATS PRIMARY use a different slot name so that they can
					// appear in the bar instead of the dropdown 
					FORMATS_PRIMARY.map(
						(format) => (
							<Slot
								name={`RichText.ToolbarControls.${format.replace('core/', '')}`}
								key={format}
							/>
						)
					)
				}
				<Slot name="RichText.ToolbarControls">
					{ (fills) => {
						console.info('fills:', fills)
						// these are the `RichTextToolbarButton`s the formats' `GetTransform`s returned  
						const controlsFromFills = fills.map(([{props}]) => props)

						return (
							<Fragment>
								<DropdownMenu
									label={__('More rich text controls')}
									icon={icons.chevronDown}
									controls={
										[
											_.sortBy(controlsFromFills, 'title'),
											_.sortBy(extraControls, 'title'),
										]
									}
									popoverProps={MORE_FORMATS_POPOVER_PROPS}
								/>
							</Fragment>
						)
					}}
				</Slot>

			</Toolbar>
		</div>
	);
};











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
	// console.info('multi-edit/block-toolbar/render', blocks, blocks.map((b)=>b.clientId), firstId)
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

{
	const styleNode = document.createElement('style')
	styleNode.innerText = STYLE
	document.head.appendChild(styleNode)
}
