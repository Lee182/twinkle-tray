import React from 'react'
import {useEffect, Component} from 'react'
import {debounce} from 'lodash-es'

class Slider extends Component {
	constructor(props) {
		super(props)
		this.state = this.reset({props: this.props, bOut: true}).state
	}

	reset({props, bOut = false}) {
		const out = {
			state: {
				level: this.cap(props.level)
			}
		}
		this.onChange = debounce(this._onChange, props.msOnChangeDebounced, {leading: false, trailing: true})
		if (bOut) {
			return out
		}
		this.setState(out.state)
	}

	handleChange = (event) => {
		this.setState({level: this.cap(event.target.value)}, this.onChange)
	}

	handleWheel = (event) => {
		if (this.props.scrolling === false) return false
		this.setState({level: this.cap(this.state.level * 1 + Math.round(event.deltaY * -1 * 0.01))}, this.onChange)
	}

	_onChange = () => {
		this.props.onChange(this.cap(this.state.level) * 1, this)
	}

	cap = (level) => {
		const {min, max} = this.props
		let capped = level * 1
		if (capped < min) {
			capped = min
		} else if (capped > max) {
			capped = max
		}
		return capped
	}

	componentDidUpdate(oldProps) {
		if (oldProps.level !== this.props.level) {
			this.reset({props: this.props})
			return
		}
		if (oldProps.msOnChangeDebounced !== this.props.msOnChangeDebounced) {
			this.reset({props: this.props})
			return
		}
	}

	renderName = () => {
		if (this.props.name) {
			return (
				<div className="name-row">
					<div className="icon">
						{this.props.monitortype == 'wmi' ? <span>&#xE770;</span> : <span>&#xE7F4;</span>}
					</div>
					<div className="title">{this.props.name}</div>
				</div>
			)
		}
	}

	render() {
		const {min, max} = this.props
		const styleProgress = {
			width: 0 + (this.state.level - min) * (100 / (max - min)) + '%'
		}
		return (
			<div className="monitor-item">
				{this.renderName()}
				<div className="input--range">
					<div className="rangeGroup">
						<input
							type="range"
							min={min}
							max={max}
							step={1}
							value={this.state.level}
							onChange={this.handleChange}
							onWheel={this.handleWheel}
							className="range"
						/>
						<div className="progress" style={styleProgress} />
					</div>
					<div className="val">{this.state.level}</div>
				</div>
			</div>
		)
	}
}

Slider.defaultProps = {
	min: 0,
	max: 100,
	level: 50,
	msOnChangeDebounced: 100,
	onChange: () => {}
}

export default Slider
