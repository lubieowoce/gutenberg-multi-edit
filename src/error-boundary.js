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
		this.setState({hasError: true, error, errorInfo})
	}

	render() {
		const {children: renderChild, context} = this.props
		const {hasError, error, errorInfo} = this.state
		const resetError = () => this.setState({hasError: false, error: null})
		return renderChild({hasError, error, errorInfo, resetError, context})
	}
}
