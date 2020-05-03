import {Fragment} from '@wordpress/element'
import {BlockEdit, BlockControls} from '@wordpress/block-editor'
import {noop} from 'lodash'

export const MultiBlockEdit = ({name, attributes, setAttributes, instanceBlock}) => {
	// hang the BlockEdit on an existing block to get the block type's BlockControls
	const {name: blockName, clientId} = instanceBlock
	if (name !== blockName) {
		console.warn('block', instanceBlock, 'is not of the specified type:', name)
		return null
	}
	return (
		<div style={{display: 'none'}}>
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
	)	
}
