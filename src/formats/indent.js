
import * as richText from '@wordpress/rich-text'
import {registerFormatType} from '@wordpress/rich-text'

import {RichTextToolbarButton} from '@wordpress/block-editor'
import {Fragment} from '@wordpress/element'
import {
	formatIndent as iconIndent,
	formatOutdent as iconOutdent,
} from '@wordpress/icons'


const richTextBounds = ({text}) => [0, text.length]

const NAME = 'custom/indent'
const TITLE = 'Indent'

const INDENT_WIDTH_PX = 20


const apply = (value, {indent: _prevIndent}, indentChange) => {
	if (indentChange === 0) { return value }
	const prevIndent = _prevIndent ? Number(_prevIndent) : 0
	const newIndent = prevIndent + indentChange
	if (newIndent === 0) {
		return clear(value)
	}
	const [start, end] = richTextBounds(value)
	return richText.applyFormat(
		value,
		{
			type: NAME,
			attributes: {
				indent: `${newIndent}`,
				style: `padding-left: ${INDENT_WIDTH_PX * newIndent}px; display: block;`
			},
		},
		start, end
	)
}

const clear = (value) => {
	const [start, end] = richTextBounds(value)
	return richText.removeFormat(value, NAME, start, end)
}


const GetTransform = ({onTransformReady, isActive, activeAttributes}) => {
	return (
		<Fragment>
			<RichTextToolbarButton
				icon={iconIndent}
				title={`${TITLE}: Increase`}
				isActive={isActive}
				onClick={() => {
					const transform = (value) => apply(value, activeAttributes || {}, 1)
					onTransformReady(transform)
				}}
			/>
			{isActive && (
				<RichTextToolbarButton
					icon={iconOutdent}
					title={`${TITLE}: Decrease`}
					isActive={isActive}
					onClick={() => {
						const transform = (value) => apply(value, activeAttributes || {}, -1)
						onTransformReady(transform)
					}}
				/>
			)}
			{isActive && (
				<RichTextToolbarButton
					icon={iconOutdent}
					title={`${TITLE}: Clear`}
					onClick={() => {
						const transform = (value) => clear(value)
						onTransformReady(transform)
					}}
				/>
			)}
		</Fragment>
	)
}



const SETTINGS = {
	title: TITLE,

	// divs aren't permitted within <p> tags, and using a div here
	// makes the block parser barf 
	tagName: 'span',
	className: 'has-indent',
	attributes: {
		'indent': 'data-indent-level',
		'style': 'style',
	},
	
	edit: ({value, onChange, ...props}) => (
		<GetTransform
			onTransformReady={(transform) => onChange(transform(value))}
			{...props}
		/>
	),
	getTransform: GetTransform,
}

registerFormatType(NAME, SETTINGS)
