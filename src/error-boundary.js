import {Component} from '@wordpress/element'

export class ErrorBoundary extends Component {
	constructor(props) {
		super(props)
		this.state = {hasError: false}
	}

	componentDidCatch(error, errorInfo) {
		const {componentStack} = errorInfo
		const {onError, context = null} = this.props
		console.error(error, context, componentStack)
		if (onError) {
			onError({context, error, errorInfo})
		}
		this.setState({hasError: true, error})
	}

	render() {
		const {children: renderChild, context} = this.props
		const {hasError, error} = this.state
		return renderChild({hasError, error, context})
	}
}
