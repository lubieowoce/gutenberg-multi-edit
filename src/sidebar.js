import {PluginSidebar} from '@wordpress/edit-post'
import {grid as iconGrid} from '@wordpress/icons'
import {
	PanelBody,
	createSlotFill,
} from '@wordpress/components'


export const SIDEBAR_NAME = 'inspector-sidebar'
const {
	Slot: SidebarContentsSlot,
	Fill: SidebarContents,
} = createSlotFill('MultiEdit.SidebarContents')
SidebarContents.Slot = SidebarContentsSlot
export {SidebarContents}

export const Sidebar = () => (
	<PluginSidebar
		name={ SIDEBAR_NAME }
		title="Multi-Edit block inspector"
		>
		<SidebarContents.Slot >
			{ (fills) => 
				(fills.length !== 0)
					? fills
					: (
						<PanelBody>
							No blocks selected.
						</PanelBody>
					)
			}
		</SidebarContents.Slot>
	</PluginSidebar>
)