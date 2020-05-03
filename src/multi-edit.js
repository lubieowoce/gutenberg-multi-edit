import * as _ from 'lodash'
import {Fragment, useMemo, useState, useEffect} from '@wordpress/element'
import {useSelect, useDispatch} from '@wordpress/data'
import {getBlockType} from '@wordpress/blocks'
import {
	Popover,
	Toolbar,
	ToolbarButton,
	Card, CardBody,
	Button,
} from '@wordpress/components'

import {
	BlockControls,
	InspectorControls,
	NavigableToolbar,
	AlignmentToolbar,
	BlockIcon,
} from '@wordpress/block-editor'
import {Icon} from '@wordpress/icons'

import * as richText from '@wordpress/rich-text'

import * as fmt from './format-utils'
import {MultiFormatToolbar} from './multi-format-toolbar'
import {MultiBlockEdit} from './multi-block-edit'
import {SidebarContents} from './sidebar'
import {selectMultiple} from './icons'

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


	const blocksByType = _.groupBy(blocks, 'name')

	let [selectedTypeName, setSelectedTypeName] = useState(null)

	{
		let overrideSelected = undefined

		// if only one type is selected, pick it
		const typesInSelection = Object.keys(blocksByType)
		if (typesInSelection.length === 1) {
			overrideSelected = typesInSelection[0]
		}
		// fall back to no selected type if block selection changed
		// and no blocks of type `selectedTypeName` are selected anymore
		if (selectedTypeName && !(selectedTypeName in blocksByType)) {
			overrideSelected = null
		}

		if (overrideSelected !== undefined) {
			selectedTypeName = overrideSelected
		}
		useEffect(() => {
			if (overrideSelected !== undefined) {
				setSelectedTypeName(overrideSelected)
			}
		}, [overrideSelected])
	}


	const selectedType = selectedTypeName ? getBlockType(selectedTypeName) : null

	let multiBlockEdit = null
	if (selectedTypeName) {
		const name = selectedTypeName
		const typeBlocks = blocksByType[name]
		const setAllAttributes = (update) => (
			batchUpdateBlockAttributes(typeBlocks.map(({clientId}) => [clientId, update]))
		)
		// selectedType = getBlockType(name)
		const allAttrs = typeBlocks.map((b) => b.attributes)
		const commonAttrs = commonAttributes(allAttrs)
		multiBlockEdit = (
			<MultiBlockEdit
				name={name}
				attributes={commonAttrs}
				setAttributes={setAllAttributes}
				instanceBlock={typeBlocks[0]}
			/>
		)
	}

	const typePicker = (
		<TypePicker
			selected={selectedTypeName}
			types={Object.keys(blocksByType)}
			onSelect={setSelectedTypeName}
		/>
	)

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

		{ multiBlockEdit }

		<BlockToolbarPopover>
			<NavigableToolbar
				aria-label='Multi-Edit Tools'
				className="multi-edit__toolbar-wrapper block-editor-block-toolbar"
				>

				{ (multiBlockEdit)
					? (
						<Fragment>
							<Toolbar>
								{ selectedType && 
									<div className="components-toolbar__control multi-edit__type-icon">
										<BlockIcon icon={selectedType.icon} />
										<span className="indicator-icon"><Icon icon={selectMultiple}/></span>
									</div>
								}
							</Toolbar>
							{ blocks.every((b) => b.name === 'core/paragraph') &&
								<Toolbar>
									<ToolbarButton 
										title = {`Merge ${blocks.length} paragraphs`}
										icon = 'editor-insertmore'
										// isActive = {blocks.every((b) => b.name === 'core/paragraph')}
										onClick = {() => mergeParagraphs(blocks, {replaceBlocks})}
									/>
								</Toolbar>
							}

							<BlockControls.Slot
								bubblesVirtually
								className="block-editor-block-toolbar__slot"
							/>
							
						 </Fragment>
					 )
					: (
						<AlignmentToolbar
							value={align}
							onChange={setAligns}
						/>
					)
				}

				{ anyRichTexts &&
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
				}

			</NavigableToolbar>
		</BlockToolbarPopover>

		{ /*
		the sidebar should be rendered from a plugin context,
		so it's created in MultiEditPlugin, and here we're
		just filling in the contents
		*/ }
		<SidebarContents>
			<div className="block-editor-block-inspector">
				<Card>
					<CardBody>
						{`${blocks.length} blocks selected`}
					</CardBody>
				</Card>
				{ typePicker }

				<InspectorControls.Slot bubblesVirtually />

			</div>
		</SidebarContents>

	</Fragment>)
}



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
		{...props}
		>
		{children}
	</Popover>
)


const TypePicker = ({types, selected, onSelect}) => (
	<div className="multi-edit__type-picker">
		{ types.map((typeName) => {
			const type = getBlockType(typeName)
			const isSelected = typeName === selected
			return (
				<Button
					isActive={isSelected}
					title={type.title}
					onClick={() => onSelect(typeName)}
					key={typeName}
					className={"tab " + (isSelected ? "active" : "not-active")}
					>
					<BlockIcon icon={ type.icon } />
				</Button>
			)
		})
		}
	</div>
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
	if (allAttrs.length === 0) { return undefined }
	if (allAttrs.length === 1) { return allAttrs[0] }
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
