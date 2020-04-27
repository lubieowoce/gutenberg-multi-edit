import {Fragment} from '@wordpress/element'
import {BlockEdit, BlockControls} from '@wordpress/block-editor'
import {noop} from 'lodash'

export const MultiBlockControls = ({blockName, attributes, setAttributes, instanceBlock}) => {
	// hang the BlockEdit on an existing block to get the block type's BlockControls
	const {name, clientId} = instanceBlock
	if (name !== blockName) {
		console.warn('block', instanceBlock, 'is not of the specified type:', blockName)
		return null
	}
	return (
		<Fragment>
			{ /* BlockEdit will create fills for BlockControls.Slot below.
				we only care about those, so hide the rest */ }
			<div style={ { display: 'none' } }>
				<BlockEdit
					isFakeBlockEdit={ true }
					name={ name }
					isSelected={ true }
					attributes={ attributes }
					setAttributes={ setAttributes }
					// insertBlocksAfter={ isLocked ? undefined : onInsertBlocksAfter }
					// onReplace={ isLocked ? undefined : onReplace }
					// mergeBlocks={ isLocked ? undefined : onMerge }
					clientId={ clientId }
					isSelectionEnabled={ false }
					toggleSelection={ noop }
				/>
			</div>
			<BlockControls.Slot bubblesVirtually>
				{(fills) => { console.info('BlockControls fills', fills); return fills }}
			</BlockControls.Slot>
		</Fragment>
	)	
}