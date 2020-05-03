import {registerPlugin} from '@wordpress/plugins'
import {name, settings} from './plugin'

import './formats/indent'

registerPlugin(name, settings)
