import React, {PureComponent} from 'react'
import Slider from './Slider'
import TranslateReact from '../TranslateReact'

const monitorSort = (a, b) => {
	const aSort = a.order === undefined ? 999 : a.order * 1
	const bSort = b.order === undefined ? 999 : b.order * 1
	return aSort - bSort
}

let T = new TranslateReact({}, {})

export default class BrightnessPanel extends PureComponent {
	getMonitorName = (monitor, renames) => {
		if (Object.keys(renames).indexOf(monitor.id) >= 0 && renames[monitor.id] != '') {
			return renames[monitor.id]
		} else {
			return monitor.name
		}
	}

	// Enable/Disable linked levels
	toggleLinkedLevels = () => {
		const linkedLevelsActive = this.state.linkedLevelsActive ? false : true
		this.setState({
			linkedLevelsActive
		})
		window.sendSettings({
			linkedLevelsActive
		})
	}

	updateMonitorBrightness = ({level, monitorActive}) => {
		const monitors = Object.assign(this.state.monitors, {})
		const bLinkedLevelsActive = this.state.linkedLevelsActive
		for (let monitor of monitors) {
			const bMonitorActive = monitor.id == monitorActive.id
			if (bMonitorActive) {
				monitor.brightness = level
			}
			if (!bMonitorActive && bLinkedLevelsActive) {
				monitor.brightness = this.normalize(
					this.normalize(level, false, monitorActive.min, monitorActive.max),
					true,
					monitor.min,
					monitor.max
				)
			}
		}
		this.setState({monitors}, () => {
			this.levelsChanged = true
			if (this.state.updateInterval === 999) this.syncBrightness()
		})
		this.forceUpdate()
	}

	// Update monitor info
	recievedMonitors = (e) => {
		if (this.state.monitors.length > 0 || e.detail.length > 0) {
			let newMonitors = Object.assign(e.detail, {})
			this.lastLevels.length = e.detail.length
			this.setState({
				monitors: newMonitors
			})
		}
	}

	updateMinMax = () => {
		if (this.state.monitors.length > 0) {
			let newMonitors = Object.assign(this.state.monitors, {})

			for (let monitor of newMonitors) {
				for (let remap in this.state.remaps) {
					if (monitor.name == remap) {
						monitor.min = this.state.remaps[remap].min
						monitor.max = this.state.remaps[remap].max
					}
				}
			}

			this.levelsChanged = true

			this.setState(
				{
					monitors: newMonitors
				},
				() => {
					this.doBackgroundEvent = true
				}
			)
		}
	}

	// Update settings
	recievedSettings = (e) => {
		const settings = e.detail
		const linkedLevelsActive = settings.linkedLevelsActive || false
		const updateInterval = (settings.updateInterval || 500) * 1
		const remaps = settings.remaps || {}
		const names = settings.names || {}
		this.levelsChanged = true
		this.setState(
			{
				linkedLevelsActive,
				remaps,
				names,
				updateInterval
			},
			() => {
				this.resetBrightnessInterval()
				this.updateMinMax()
				this.forceUpdate()
				this.doBackgroundEvent = true
			}
		)
	}

	recievedUpdate = (e) => {
		const update = e.detail
		this.setState({
			update
		})
	}

	recievedSleep = (e) => {
		this.setState({
			sleeping: e.detail
		})
	}

	normalize(level, sending = false, min = 0, max = 100) {
		if (min > 0 || max < 100) {
			let out = level
			if (sending) {
				out = min + level / 100 * (max - min)
			} else {
				out = (level - min) * (100 / (max - min))
			}
			return Math.round(out)
		} else {
			return level
		}
	}

	resetBrightnessInterval = () => {
		if (this.updateInterval) clearInterval(this.updateInterval)
		this.updateInterval = setInterval(this.syncBrightness, this.state.updateInterval || 500)
	}

	// Send new brightness to monitors, if changed
	syncBrightness = () => {
		const monitors = this.state.monitors
		if (this.levelsChanged && (window.showPanel || this.doBackgroundEvent) && monitors.length) {
			this.doBackgroundEvent = false
			this.levelsChanged = false

			try {
				for (let idx = 0; idx < monitors.length; idx++) {
					if (monitors[idx].brightness != this.lastLevels[idx]) {
						window.updateBrightness(monitors[idx].id, monitors[idx].brightness)
					}
				}
			} catch (e) {
				console.error('Could not update brightness')
			}
		}
	}

	constructor(props) {
		super(props)
		this.state = {
			monitors: [],
			linkedLevelsActive: false,
			names: {},
			update: false,
			sleeping: false
		}
		this.lastLevels = []
		this.updateInterval = null
		this.doBackgroundEvent = false
		this.levelsChanged = false
	}

	componentDidMount() {
		window.addEventListener('monitorsUpdated', this.recievedMonitors)
		window.addEventListener('settingsUpdated', this.recievedSettings)
		window.addEventListener('localizationUpdated', (e) => {
			T.setLocalizationData(e.detail.desired, e.detail.default)
		})
		window.addEventListener('updateUpdated', this.recievedUpdate)
		window.addEventListener('sleepUpdated', this.recievedSleep)

		// Update brightness every interval, if changed
		this.resetBrightnessInterval()
	}

	componentDidUpdate() {
		window.sendHeight(window.document.getElementById('panel').offsetHeight)
	}

	renderMonitors = () => {
		if (!this.state.monitors || this.state.monitors.length == 0) {
			return <div className="no-displays-message">{T.t('GENERIC_NO_COMPATIBLE_DISPLAYS')}</div>
		}
		const sorted = this.state.monitors.slice(0).sort(monitorSort)
		// let brightness = this.state.linkedLevelsActive ?
		return sorted.map((monitor, index) => {
			return (
				<Slider
					name={this.getMonitorName(monitor, this.state.names)}
					id={monitor.id}
					level={monitor.brightness}
					min={monitor.min}
					max={monitor.max}
					num={monitor.num}
					monitortype={monitor.type}
					key={monitor.num}
					msOnChangeDebounced={0}
					onChange={(level, slider) => {
						this.updateMonitorBrightness({level, slider, monitorActive: monitor})
					}}
				/>
			)
		})
	}
	renderUpdateBar = () => {
		if (this.state.update && this.state.update.show) {
			return (
				<div className="updateBar">
					<div className="left">
						{T.t('PANEL_UPDATE_AVAILABLE')} ({this.state.update.version})
					</div>
					<div className="right">
						<a onClick={window.installUpdate}>{T.t('GENERIC_INSTALL')}</a>
						<a className="icon" title={T.t('GENERIC_DISMISS')} onClick={window.dismissUpdate}>
							&#xEF2C;
						</a>
					</div>
				</div>
			)
		}
	}

	render() {
		if (this.state.sleeping) {
			return <div className="window-base" data-theme={window.settings.theme || 'default'} id="panel" />
		}
		return (
			<div className="window-base" data-theme={window.settings.theme || 'default'} id="panel">
				<div className="titlebar">
					<div className="title">{T.t('PANEL_TITLE')}</div>
					<div className="icons">
						{this.state.monitors.length > 1 && (
							<div
								title={T.t('PANEL_BUTTON_LINK_LEVELS')}
								data-active={this.state.linkedLevelsActive}
								onClick={this.toggleLinkedLevels}
								className="link">
								&#xE71B;
							</div>
						)}
						<div
							title={T.t('PANEL_BUTTON_TURN_OFF_DISPLAYS')}
							className="off"
							onClick={window.turnOffDisplays}>
							&#xEC46;
						</div>
						<div title={T.t('GENERIC_SETTINGS')} className="settings" onClick={window.openSettings}>
							&#xE713;
						</div>
					</div>
				</div>
				{this.renderMonitors()}
				{this.renderUpdateBar()}
			</div>
		)
	}
}
