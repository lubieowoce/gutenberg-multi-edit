import * as richText from '@wordpress/rich-text'
import * as _ from 'lodash'

const richTextSelected = (args) => {
	const value = richText.create(args)
	value.start = 0
	value.end = value.text.length // no -1
	return value
}

export const editToTransform = ({name: formatName, edit: Edit}) => (
	({onTransformReady, isActive, activeAttributes}) => {
		let dummyText = richTextSelected({text: '_'})
		if (isActive) {
			dummyText = richText.applyFormat(
				dummyText,
				{type: formatName, attributes: activeAttributes}
			)
		}
		return (
			<Edit
				value={dummyText}
				onChange={(newDummyText) => {
					const activeFormat = richText.getActiveFormat(newDummyText, formatName)
					const transform = (
						activeFormat
							? (value) => richText.applyFormat(value, activeFormat)
							: (value) => richText.removeFormat(value, formatName)
					)
					onTransformReady(transform)
				}}
				isActive={isActive}
				activeAttributes={activeAttributes}
			/>
		)
	}
)

export const addTransform = (formatType) => {
	if ('getTransform' in formatType) { return formatType }
	return _.set({...formatType}, 'getTransform', editToTransform(formatType))
}


export const reregisterWithTransform = (formatName, formatTypes) => {
	const _formatType = formatTypes[formatName]
	if (!_formatType || 'getTransform' in _formatType) { return _formatType }

	console.group(`reregistering '${formatName}'`)
	const formatType = richText.unregisterFormatType(formatName)
	let res = undefined
	if (formatType) {
		const {_name, ...settings} = addTransform(formatType)
		console.info('new settings', settings)
		res = richText.registerFormatType(formatName, settings)
	} else {
		console.info("format doesn't exist", formatName)
	}
	console.groupEnd()
	return res
}
