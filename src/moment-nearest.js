const aUnits = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond']

const getUnits = (sUnit, iShift, mDate, moment) => {
	sUnit = moment.normalizeUnits(sUnit)
	const iIndex = aUnits.indexOf(sUnit)
	if (!iIndex) {
		throw new Error('undefined unit passed')
	}
	const oUnits = aUnits.slice(iIndex + 1).reduce((oUnit, sUnit) => {
		oUnit[sUnit] = 0
		return oUnit
	}, {})
	oUnits[sUnit] = mDate.get(sUnit) + iShift
	return oUnits
}

module.exports = function(moment) {
	const round = function(sUnit, iRound = 0) {
		const mDate = this
		// 0 for round
		// +1 for up
		// -1 for down
		const oUnitDown = getUnits(sUnit, 0, mDate, moment)
		const oUnitUp = getUnits(sUnit, +1, mDate, moment)
		const mDown = mDate.clone().set(oUnitDown)
		if (iRound === -1) {
			return mDown
		}
		const mUp = mDate.clone().set(oUnitUp)
		if (iRound === 1) {
			return mUp
		}
		const iDown = Math.abs(mDate.diff(mDown))
		const iUp = Math.abs(mDate.diff(mUp))
		return moment((iDown < iUp ? mDown : mUp).toDate())
	}
	const shiftDiff = function(sUnit = 'hour') {
		const mMidday = this
		return mMidday.round(sUnit).get(sUnit) - 12
	}
	const proto = Object.getPrototypeOf(moment())
	proto.round = round
	proto.shiftDiff = shiftDiff
	proto.nea
}
