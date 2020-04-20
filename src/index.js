/* eslint no-unused-vars: ["warn", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }] */

console.info('multi-edit')

import {createBlock} from '@wordpress/blocks'
import {registerPlugin} from '@wordpress/plugins'
import {PluginBlockSettingsMenuItem} from '@wordpress/edit-post'
import {Fragment} from '@wordpress/element'

import {useSelect, useDispatch} from '@wordpress/data'

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
import './formats/indent'

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


// simple toggles
const FORMATS_SIMPLE = {
	"core/bold": {
		icon: icons.formatBold,
		apply: {type: "core/bold"}
	},
	"core/italic": {
		icon: 'editor-italic', // icons.formatItalic,
		apply: {type: "core/italic"}
	},
	"core/code": {
		icon: icons.code,
		apply: {type: "core/code"}
	},
	"core/strikethrough": {
		icon: icons.formatStrikethrough,
		apply: {type: "core/strikethrough"}
	},
	"core/underline": {
		icon: 'editor-underline',
		apply: {type: "core/underline", attributes: {style: 'text-decoration: underline;'}}
	},
}

// more complicated controls
const FORMATS_ADVANCED = {
	"core/text-color": {icon: icons.textColor}
}

const FORMATS_ALL = (
	Object.keys(FORMATS_SIMPLE) + Object.keys(FORMATS_ADVANCED)
)






const MultiToolbar = ({blocks}) => {

	const {
		replaceBlocks,
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	} = useDispatch('core/block-editor')

	const coreFormatTypes = useSelect((select) =>
		select('core/rich-text').getFormatTypes()
	).filter(({name}) => FORMATS_ALL.includes(name))


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
		commonFormats = fmt.commonActiveFormats(coreFormatTypes, blockMaybeTexts.filter(Boolean))
	} else {
		commonFormats = null
	}
	console.info('commonFormats', commonFormats)
	// console.info('dummyText', dummyText, richText.toHTMLString({value: dummyText}))


	const onChangeFormat = ({action, format: formatValue}) => {
		const updateFormat = (
			action === "add" ? richText.applyFormat :
			action === "del" ? (text, {type: formatId}) => richText.removeFormat(text, formatId) :
				(text, _formatValue) => {
					console.error('onChangeFormat :: unknown action', {action, format: _formatValue})
					return text
				}
		)

		batchUpdateBlockAttributes(
			_.zip(blocks, blockMaybeTexts)
			.map(([block, text]) => {
				if (!text) { return null }
				text = updateFormat(text, formatValue)
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
							onChange={(_active, action) =>
								onChangeFormat(action)
							}
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
import { DropdownMenu, Button } from '@wordpress/components';

const MORE_FORMATS_POPOVER_PROPS = {
	position: 'bottom right',
	isAlternate: true,
};

const FORMATS_PRIMARY = ['core/bold', 'core/italic', /*'text-color'*/]
const FORMATS_SECONDARY = (
	_.difference(Object.keys(FORMATS_SIMPLE), FORMATS_PRIMARY)
)

const FormatToolbar = ({activeFormats, onChange, controls}) => {
	const {getFormatType} = useSelect((select) => select('core/rich-text'))

	const formatToggleControl = ({name: formatId, title}) => {
		const isActive = formatId in activeFormats
		return {
			icon: FORMATS_SIMPLE[formatId].icon,
			title: title,
			isActive: isActive,
			onClick: () => {
				const newIsActive = !isActive
				const formatValue = FORMATS_SIMPLE[formatId].apply
				const [newActiveFormats, action] = (
					newIsActive
						? [_.set({...activeFormats}, formatId, formatValue),
						   {action: "add", format: formatValue}]
						: [_.unset(activeFormats, formatId),
						   {action: "del", format: formatValue}]
				)
				onChange(newActiveFormats, action)
			}
		}
	}

	const FormatToggle = ({formatType}) => {
		return <Button {...formatToggleControl(formatType)} />
	}

	return (
		<div className="block-editor-format-toolbar">
			<Toolbar>
				{ FORMATS_PRIMARY.map((formatId) =>
					<FormatToggle formatType={getFormatType(formatId)} key={formatId}/>
				  )
				}
				<DropdownMenu
					label={ __('More rich text controls') }
					icon={icons.chevronDown}
					controls={
						[
							_.sortBy(FORMATS_SECONDARY.map(getFormatType), 'title').map(formatToggleControl),
							_.sortBy(controls, 'title'),
						]
					}
					popoverProps={MORE_FORMATS_POPOVER_PROPS}
				/>
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
