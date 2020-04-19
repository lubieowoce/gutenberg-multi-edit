// gutenberg/packages/block-editor/src/components/rich-text/format-toolbar/index.js



/**
 * External dependencies
 */

import { orderBy } from 'lodash';

/**
 * WordPress dependencies
 */

import { __ } from '@wordpress/i18n';
import { Toolbar, Slot, DropdownMenu } from '@wordpress/components';

// import { chevronDown } from '@wordpress/icons';
import { SVG, Path } from '@wordpress/primitives'
const chevronDown = (
	<SVG viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<Path d="M17 9.4L12 14 7 9.4l-1 1.2 6 5.4 6-5.4z" />
	</SVG>
)

const POPOVER_PROPS = {
	position: 'bottom right',
	isAlternate: true,
};

export const FormatToolbar = () => {
	return (
		<div className="block-editor-format-toolbar">
			<Toolbar>
				{ [ 'bold', 'italic', 'link', 'text-color' ].map(
					( format ) => (
						<Slot
							name={ `RichText.ToolbarControls.${ format }` }
							key={ format }
						/>
					)
				) }
				<Slot name="RichText.ToolbarControls">
					{ ( fills ) => {
						console.log('RichText.ToolbarControls fills:', fills)
						return fills.length !== 0 && (
							<DropdownMenu
								label={ __( 'More rich text controls' ) }
								icon={ chevronDown }
								controls={ orderBy(
									fills.map( ( [ { props } ] ) => props ),
									'title'
								) }
								popoverProps={ POPOVER_PROPS }
							/>
						)
					} }
				</Slot>
			</Toolbar>
		</div>
	);
};

export default FormatToolbar;
