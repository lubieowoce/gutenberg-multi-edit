import * as richText from '@wordpress/rich-text'
import * as _ from 'lodash'

export const commonActiveFormats = (formatTypes, richTexts) => (
	richTexts.length === 0 ? [] : 
		richTexts
			.map((t) => activeFormats(formatTypes, t))
			.reduce(formatsIntersection)
)

export const formatsIntersection = (fsA, fsB) => {
	const common = []
	for (const a of fsA) {
		if (_.findIndex(fsB, (b) => a.type === b.type && _.isEqual(a, b) ) !== -1) {
			common.push(a)
		}
	}
	return common
}

export const formatsSubtract = (fsA, fsB) => {
	const common = []
	for (const a of fsA) {
		if (_.findIndex(fsB, (b) => a.type === b.type && _.isEqual(a, b) ) === -1) {
			common.push(a)
		}
	}
	return common
}

export const activeFormats = (formatTypes, value) => (
	formatTypes
		.map(({name}) => richText.getActiveFormat(value, name))
		.filter(Boolean)
)

export const applyFormats = (text, formats) => (
	formats.reduce((t, f) => richText.applyFormat(t, f), text)
)

export const removeExactFormat = (text, format) => {
	const active = richText.getActiveFormat(text, format.type)
	if (active && _.isEqual(format, active)) {
		return richText.toggleFormat(text, format)
	}
	return text
}
