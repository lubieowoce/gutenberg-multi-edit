import * as _ from 'lodash'
import {Fragment, useMemo} from '@wordpress/element'
import {useSelect, useDispatch} from '@wordpress/data'
import {getBlockType} from '@wordpress/blocks'
import {
	Popover,
	Toolbar,
	ToolbarButton,
	PanelBody,
} from '@wordpress/components'

import {
	InspectorControls,
	NavigableToolbar,
	AlignmentToolbar,
	BlockIcon,
	// BlockControls,
	// BlockFormatControls,
	// RichTextToolbarButton,
} from '@wordpress/block-editor'

import * as richText from '@wordpress/rich-text'

import * as fmt from './format-utils'
import {MultiFormatToolbar} from './multi-format-toolbar'
import {MultiBlockControls} from './multi-block-controls'
import {SidebarContents} from './sidebar'


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


const FORMATS_DISABLED = [
	"editorskit/clear-formatting",
]



const STYLE = `
.multi-edit-toolbar-wrapper {
	margin-bottom: 13px;
	display: flex;
}
`
export const MultiEdit = ({blocks}) => {

	const {
		replaceBlocks,
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent,
	} = useDispatch('core/block-editor')

	const allFormatTypes = useSelect((select) =>
		select('core/rich-text').getFormatTypes()
	)
	const allowedFormatTypes = useMemo(() => (
		allFormatTypes.filter(({name, object: usesReplacements = false}) =>
			!FORMATS_DISABLED.includes(name) && !usesReplacements
		)
	), [allFormatTypes])

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
	let multiBlockControls, commonType = null
	if (hasCommonName) {
		const name = maybeName
		commonType = getBlockType(name)
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

	return (<Fragment>
		<BlockToolbarPopover>

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

				{
					multiBlockControls
						? <Toolbar> { multiBlockControls } </Toolbar>
						: <AlignmentToolbar value={align} onChange={setAligns} />
				}

				{ anyRichTexts &&
					<Fragment>
					<MultiFormatToolbar
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

		</BlockToolbarPopover>

		{ /*
		the sidebar should be rendered from a plugin context,
		so it's created in MultiEditPlugin, and here we're
		just filling in the contents
		*/ }
		<SidebarContents>
			<PanelBody>
				{ commonType
					? (
						<div className="block-editor-block-card">
							<BlockIcon icon={ commonType.icon } showColors />
							<div className="block-editor-block-card__content">
								<div className="block-editor-block-card__title">
									{`${blocks.length} ${commonType.title} blocks selected`}
								</div>
								{/*<span className="block-editor-block-card__description">
									{ blockType.description }
								</span>*/}
							</div>
						</div>

					)
					: `${blocks.length} blocks selected`
				}
			</PanelBody>
			{ multiBlockControls &&
				<InspectorControls.Slot bubblesVirtually />
			}
		</SidebarContents>

	</Fragment>)
}

MultiEdit.style = STYLE


const BlockToolbarPopover = ({children, ...props}) => (
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
		{children}
	</Popover>

)



import {createBlock} from '@wordpress/blocks'

const mergeParagraphs = (paragraphs, {replaceBlocks}) => {
	const ids = paragraphs.map((b) => b.clientId)
	const merged = paragraphs.map((b) => b.attributes.content).join('<br>')
	replaceBlocks(ids, [createBlock('core/paragraph', {content: merged})])
}

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
