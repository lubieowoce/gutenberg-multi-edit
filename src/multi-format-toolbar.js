
import { DropdownMenu, Slot, Toolbar } from '@wordpress/components'
import { RichTextToolbarButton } from '@wordpress/block-editor'
import { Fragment, useCallback } from '@wordpress/element'
// import * as _ from 'lodash'
import { noop, sortBy, groupBy } from 'lodash'
import { __ } from '@wordpress/i18n';
import { chevronDown } from '@wordpress/icons'

import {ErrorBoundary} from './error-boundary'

const MORE_FORMATS_POPOVER_PROPS = {
	position: 'bottom right',
	// isAlternate: true,
};

const FORMATS_PRIMARY = ['core/bold', 'core/italic', 'core/text-color']

export const MultiFormatToolbar = ({formatTypes, activeFormats, onTransformReady, controls: extraControls}) => {
	return (
		<div className="block-editor-format-toolbar">
			<Toolbar>
				{
					// instantiate the controls that use RichTextToolbarButton
					// i.e. the 'RichText.ToolbarControls' fill
					// the slot is provided right below
					formatTypes.map((formatType) => {
						const {name: formatId, getTransform: GetTransform} = formatType
						if (!GetTransform) { return null }
						const isActive = formatId in activeFormats
						const activeAttributes = isActive ? (activeFormats[formatId].attributes || {}) : {}
						return (
							<WithFallbackFormatControl key={formatId} formatType={formatType}>
								<GetTransform
									isActive={isActive}
									activeAttributes={activeAttributes}
									onTransformReady={onTransformReady}
									onFocus={noop}
								/>
							</WithFallbackFormatControl>
						)
					  })
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
						// console.info('fills:', fills)
						// these are the `RichTextToolbarButton`s the formats' `GetTransform`s returned  
						const controlsFromFills = fills.map(([{props}]) => props)
						const {
							control: controls,
							fallback: fallbacks,
						} = groupBy(
							controlsFromFills,
							({isFallback = false}) => isFallback ? 'fallback' : 'control'
						)

						return (
							<Fragment>
								<DropdownMenu
									label={__('More rich text controls')}
									icon={chevronDown}
									controls={
										[
											sortBy(controls, 'title'),
											sortBy(fallbacks, 'title'),
											sortBy(extraControls, 'title'),
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
	)
}

const FallbackFormatControl = ({formatType: {title}}) => (
	<RichTextToolbarButton
		isFallback
		icon="warning"
		isDisabled
		title={title}
		onClick={noop}
	/>
)

const WithFallbackFormatControl = ({formatType, children}) => {
	const render = useCallback(
		({hasError}) => (
			!hasError
				? children
				: <FallbackFormatControl formatType={formatType} />
		),
		[formatType, children]
	)
	return (
		<ErrorBoundary context={formatType}>
			{ render }
		</ErrorBoundary>
	)
}