
import { __ } from '@wordpress/i18n';
import { DropdownMenu, Slot } from '@wordpress/components';
import { Toolbar } from '@wordpress/components'
import { Fragment } from '@wordpress/element'
import * as _ from 'lodash'
import { chevronDown } from '@wordpress/icons'

const MORE_FORMATS_POPOVER_PROPS = {
	position: 'bottom right',
	isAlternate: true,
};

const FORMATS_PRIMARY = ['core/bold', 'core/italic', 'core/text-color']

export const FormatToolbar = ({formatTypes, activeFormats, onTransformReady, controls: extraControls}) => {
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
							<GetTransform
								formatId={formatId}
								key={formatId}
								isActive={isActive}
								activeAttributes={activeAttributes}
								onTransformReady={onTransformReady}
							/>
						)
					  })//.map((el, i) => {console.info('GetTransform', i, el); return el})
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

						return (
							<Fragment>
								<DropdownMenu
									label={__('More rich text controls')}
									icon={chevronDown}
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
	)
}

