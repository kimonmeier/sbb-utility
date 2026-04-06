import { SopreTourType } from '$lib/types/SopreTypes';
import { touren } from '../db/schema';

const MIN_REST_MINUTES = 11 * 60;
const MIN_SINGLE_RT_TOTAL_MINUTES = 36 * 60;
const MIN_SINGLE_RT_TOTAL_MINUTES_WITH_MITENTSCHEID = 33 * 60;
const MIN_WORKING_TIME_PER_SHIFT_MINUTES = 6 * 60;
const SPECIAL_WORKING_TIME_MIN_EXCLUSIVE_MINUTES = 9 * 60;
const SPECIAL_WORKING_TIME_MAX_INCLUSIVE_MINUTES = 10 * 60;
const SPECIAL_MAX_SHIFT_DURATION_MINUTES = 11 * 60;
const MAX_SHIFT_DURATION_MINUTES = 13 * 60;
const MAX_WORKING_TIME_MINUTES = 12 * 60;
const MAX_AVG_WORKING_TIME_7_WORKDAYS_MINUTES = 9 * 60;
const MAX_CONSECUTIVE_NIGHT_BOUNDARY_DAYS = 4;
const MAX_CONSECUTIVE_NIGHT_BOUNDARY_DAYS_WITH_MITENTSCHEID = 5;
const NIGHT_BOUNDARY_WINDOW_DAYS = 28;
const MAX_NIGHT_BOUNDARY_DAYS_IN_WINDOW = 15;

const DAY_OFF_TYPES = new Set<string>([
	SopreTourType.KRANK,
	SopreTourType.RUHETAGE,
	SopreTourType.KOMPENSATIONSTAG,
	SopreTourType.RUHETAG_VERLANGT,
	SopreTourType.KOMPENSATIONSTAG_VERLANGT,
	SopreTourType.RUHETAG_TAUSCH,
	SopreTourType.KOMPENSATIONSTAG_TAUSCH,
	SopreTourType.FERIEN,
	SopreTourType.GUTHABEN_RUHETAG_PERSONAL,
	SopreTourType.GUTHABEN_KOMPENSATIONSTAG_PERSONAL
]);

const RESERVE_TYPES = new Set<string>([
	SopreTourType.RESERVE,
	SopreTourType.RESERVE_FRÜH,
	SopreTourType.RESERVE_SPÄT
]);

const RUHETAG_TYPES = new Set<string>([
	SopreTourType.RUHETAGE,
	SopreTourType.RUHETAG_VERLANGT,
	SopreTourType.RUHETAG_TAUSCH
]);

type AssignedTour = typeof touren.$inferSelect;

export interface ValidationIssue {
	code: string;
	message: string;
	severity: 'error' | 'warning';
	canAcknowledge: boolean;
	decisionGroup?: string;
}

export interface TourDayValidation {
	dateKey: string;
	status: 'valid' | 'invalid';
	tourId: string;
	issues: ValidationIssue[];
}

interface ValidationState {
	previousDutyEnd: Date | null;
	previousDutyLabel: string | null;
	previousNightBoundaryDayNumber: number | null;
	consecutiveNightBoundaryDays: number;
	previousSpecialWorkRangeDayNumber: number | null;
	nightBoundaryDayNumbersInWindow: number[];
}

function toDateKey(value: number): string {
	return new Date(value).toISOString().slice(0, 10);
}

function toTourLabel(entry: AssignedTour): string {
	if (entry.tourNumber) {
		return `Tour ${entry.tourNumber}${entry.tourSuffix ? ` ${entry.tourSuffix}` : ''}`;
	}

	if (entry.abkuerzung) {
		return entry.abkuerzung;
	}

	return 'Unbekannte Tour';
}

function isDayOffType(type?: string | null): boolean {
	return Boolean(type && DAY_OFF_TYPES.has(type));
}

function isReserveType(type?: string | null): boolean {
	return Boolean(type && RESERVE_TYPES.has(type));
}

function isRuhetagType(type?: string | null): boolean {
	return Boolean(type && RUHETAG_TYPES.has(type));
}

function isUnfallType(type?: string | null): boolean {
	if (!type) {
		return false;
	}

	const normalized = type.trim().toLowerCase();
	return normalized === 'u' || normalized === 'uv' || normalized.includes('unfall');
}

function isExcludedFrom7DayAverage(type?: string | null): boolean {
	return isDayOffType(type) || isUnfallType(type);
}

function hasDutyData(entry: AssignedTour): boolean {
	return (
		entry.tourNumber != null ||
		entry.startTime != null ||
		entry.endTime != null ||
		entry.schichtdauer != null ||
		entry.arbeitszeit != null ||
		entry.bezahlteZeit != null
	);
}

function addIssue(
	issues: ValidationIssue[],
	code: string,
	message: string,
	severity: 'error' | 'warning' = 'error',
	canAcknowledge = false,
	decisionGroup?: string
) {
	issues.push({ code, message, severity, canAcknowledge, decisionGroup });
}

function getHour(value?: number | Date | null): number | null {
	if (!value) {
		return null;
	}

	const date = value instanceof Date ? value : new Date(value);
	return date.getHours();
}

function isNightBoundaryTour(entry: AssignedTour): boolean {
	const startHour = getHour(entry.startTime);
	const endHour = getHour(entry.endTime);

	const startsInWindow = startHour != null && startHour >= 0 && startHour < 4;
	const endsInWindow = endHour != null && endHour >= 0 && endHour < 4;

	return startsInWindow || endsInWindow;
}

function toDayNumber(value: number): number {
	const dateKey = toDateKey(value);
	return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
}

function isDutyEntry(entry: AssignedTour): boolean {
	return (
		!isDayOffType(entry.abkuerzung) &&
		!isReserveType(entry.abkuerzung) &&
		entry.startTime != null &&
		entry.endTime != null
	);
}

function createInitialValidationState(): ValidationState {
	return {
		previousDutyEnd: null,
		previousDutyLabel: null,
		previousNightBoundaryDayNumber: null,
		consecutiveNightBoundaryDays: 0,
		previousSpecialWorkRangeDayNumber: null,
		nightBoundaryDayNumbersInWindow: []
	};
}

function resetStateForNoDutyData(state: ValidationState) {
	state.previousNightBoundaryDayNumber = null;
	state.consecutiveNightBoundaryDays = 0;
	state.previousSpecialWorkRangeDayNumber = null;
	state.previousDutyEnd = null;
	state.previousDutyLabel = null;
}

function resetStateForDayOffOrReserve(state: ValidationState) {
	state.previousDutyEnd = null;
	state.previousDutyLabel = null;
	state.previousSpecialWorkRangeDayNumber = null;
}

function createResult(entry: AssignedTour, issues: ValidationIssue[]): TourDayValidation {
	return {
		dateKey: toDateKey(entry.datum),
		status: issues.length > 0 ? 'invalid' : 'valid',
		tourId: entry.id,
		issues
	};
}

function validateNightBoundary(
	entry: AssignedTour,
	label: string,
	dayNumber: number,
	issues: ValidationIssue[],
	state: ValidationState
): boolean {
	const nightBoundaryTour = isNightBoundaryTour(entry);

	if (!nightBoundaryTour) {
		state.previousNightBoundaryDayNumber = null;
		state.consecutiveNightBoundaryDays = 0;
		return false;
	}

	state.nightBoundaryDayNumbersInWindow.push(dayNumber);
	while (
		state.nightBoundaryDayNumbersInWindow.length > 0 &&
		dayNumber - state.nightBoundaryDayNumbersInWindow[0] >= NIGHT_BOUNDARY_WINDOW_DAYS
	) {
		state.nightBoundaryDayNumbersInWindow.shift();
	}

	if (state.nightBoundaryDayNumbersInWindow.length > MAX_NIGHT_BOUNDARY_DAYS_IN_WINDOW) {
		addIssue(
			issues,
			'NIGHT_BOUNDARY_28_DAY_LIMIT_EXCEEDED',
			`${label}: Touren mit Start/Ende zwischen 00:00 und 04:00 dürfen innerhalb von 28 Tagen höchstens an 15 Tagen zugeteilt werden (aktuell ${state.nightBoundaryDayNumbersInWindow.length} Tage).`
		);
	}

	const isConsecutiveNightBoundaryDay =
		state.previousNightBoundaryDayNumber != null &&
		dayNumber - state.previousNightBoundaryDayNumber === 1;

	state.consecutiveNightBoundaryDays = isConsecutiveNightBoundaryDay
		? state.consecutiveNightBoundaryDays + 1
		: 1;

	if (
		state.consecutiveNightBoundaryDays > MAX_CONSECUTIVE_NIGHT_BOUNDARY_DAYS &&
		state.consecutiveNightBoundaryDays <= MAX_CONSECUTIVE_NIGHT_BOUNDARY_DAYS_WITH_MITENTSCHEID
	) {
		addIssue(
			issues,
			'NIGHT_BOUNDARY_CONSECUTIVE_DAYS_MITENTSCHEID',
			`${label}: Folge mit Start/Ende zwischen 00:00 und 04:00 ist nur mit Mitentscheid zulässig (${state.consecutiveNightBoundaryDays} Tage).`,
			'error',
			true
		);
	}

	if (state.consecutiveNightBoundaryDays > MAX_CONSECUTIVE_NIGHT_BOUNDARY_DAYS_WITH_MITENTSCHEID) {
		addIssue(
			issues,
			'NIGHT_BOUNDARY_CONSECUTIVE_DAYS_EXCEEDED',
			`${label}: Touren mit Start/Ende zwischen 00:00 und 04:00 überschreiten die erlaubte Folge (${state.consecutiveNightBoundaryDays} Tage, mit Mitentscheid maximal 5 Tage).`
		);
	}

	state.previousNightBoundaryDayNumber = dayNumber;
	return true;
}

function validateSpecialWorkRange(
	entry: AssignedTour,
	label: string,
	dayNumber: number,
	nightBoundaryTour: boolean,
	issues: ValidationIssue[],
	state: ValidationState
) {
	const specialWorkRangeTour =
		entry.arbeitszeit != null &&
		entry.arbeitszeit > SPECIAL_WORKING_TIME_MIN_EXCLUSIVE_MINUTES &&
		entry.arbeitszeit <= SPECIAL_WORKING_TIME_MAX_INCLUSIVE_MINUTES;

	if (!specialWorkRangeTour) {
		state.previousSpecialWorkRangeDayNumber = null;
		return;
	}

	if (
		state.previousSpecialWorkRangeDayNumber != null &&
		dayNumber - state.previousSpecialWorkRangeDayNumber === 1
	) {
		addIssue(
			issues,
			'SPECIAL_WORK_RANGE_CONSECUTIVE_DAYS',
			`${label}: Touren mit Arbeitszeit > 9h bis max. 10h dürfen nicht an zwei aufeinanderfolgenden Tagen eingeteilt werden.`
		);
	}

	if (entry.schichtdauer == null || entry.schichtdauer > SPECIAL_MAX_SHIFT_DURATION_MINUTES) {
		addIssue(
			issues,
			'SPECIAL_WORK_RANGE_SHIFT_TOO_LONG',
			`${label}: Bei Arbeitszeit > 9h bis max. 10h darf die Arbeitsschicht höchstens 11h betragen.`
		);
	}

	if (nightBoundaryTour) {
		addIssue(
			issues,
			'SPECIAL_WORK_RANGE_NIGHT_WINDOW_FORBIDDEN',
			`${label}: Bei Arbeitszeit > 9h bis max. 10h darf die Tour nicht in die Zeit von 00:00 bis 04:00 reichen.`
		);
	}

	state.previousSpecialWorkRangeDayNumber = dayNumber;
}

function validateDutyBoundaries(
	entry: AssignedTour,
	label: string,
	issues: ValidationIssue[],
	state: ValidationState
) {
	if (!entry.startTime || !entry.endTime) {
		addIssue(
			issues,
			'MISSING_BOUNDARY_TIMES',
			`${label}: Start- und Endzeit müssen für Einsatztouren vorhanden sein.`
		);
		return;
	}

	const start = new Date(entry.startTime);
	const end = new Date(entry.endTime);

	if (end <= start) {
		addIssue(issues, 'END_BEFORE_START', `${label}: Endzeit muss nach der Startzeit liegen.`);
	}

	if (state.previousDutyEnd) {
		const restMinutes = Math.floor((start.getTime() - state.previousDutyEnd.getTime()) / 60000);
		if (restMinutes < MIN_REST_MINUTES) {
			const restHours = (restMinutes / 60).toFixed(1);
			addIssue(
				issues,
				'INSUFFICIENT_REST',
				`${label}: Ruhezeit seit ${state.previousDutyLabel ?? 'Vortag'} beträgt ${restHours}h (mindestens 11h erforderlich).`
			);
		}
	}

	state.previousDutyEnd = end;
	state.previousDutyLabel = `${toDateKey(entry.datum)} ${label}`;
}

function validateDurations(entry: AssignedTour, label: string, issues: ValidationIssue[]) {
	if (entry.schichtdauer != null && entry.schichtdauer > MAX_SHIFT_DURATION_MINUTES) {
		addIssue(
			issues,
			'SHIFT_TOO_LONG',
			`${label}: Schichtdauer ${entry.schichtdauer} min überschreitet ${MAX_SHIFT_DURATION_MINUTES} min.`
		);
	}

	if (entry.arbeitszeit != null && entry.arbeitszeit > MAX_WORKING_TIME_MINUTES) {
		addIssue(
			issues,
			'WORKING_TIME_TOO_LONG',
			`${label}: Arbeitszeit ${entry.arbeitszeit} min überschreitet ${MAX_WORKING_TIME_MINUTES} min.`
		);
	}

	if (
		entry.arbeitszeit != null &&
		entry.schichtdauer != null &&
		entry.arbeitszeit > entry.schichtdauer
	) {
		addIssue(
			issues,
			'WORKING_EXCEEDS_SHIFT',
			`${label}: Arbeitszeit darf Schichtdauer nicht überschreiten.`
		);
	}

	if (
		entry.bezahltePause != null &&
		entry.schichtdauer != null &&
		entry.bezahltePause > entry.schichtdauer
	) {
		addIssue(
			issues,
			'PAID_BREAK_EXCEEDS_SHIFT',
			`${label}: Bezahlte Pause darf Schichtdauer nicht überschreiten.`
		);
	}
}

function applySevenDayAverageChecks(sorted: AssignedTour[], results: TourDayValidation[]) {
	const relevantFor7DayAverage = sorted
		.map((entry, index) => ({ entry, index }))
		.filter(
			({ entry }) => !isExcludedFrom7DayAverage(entry.abkuerzung) && entry.arbeitszeit != null
		);

	for (let endIndex = 6; endIndex < relevantFor7DayAverage.length; endIndex++) {
		const window = relevantFor7DayAverage.slice(endIndex - 6, endIndex + 1);
		const totalMinutes = window.reduce((sum, item) => sum + (item.entry.arbeitszeit ?? 0), 0);
		const averageMinutes = totalMinutes / 7;

		if (averageMinutes <= MAX_AVG_WORKING_TIME_7_WORKDAYS_MINUTES) {
			continue;
		}

		const windowStart = toDateKey(window[0].entry.datum);
		const windowEnd = toDateKey(window[window.length - 1].entry.datum);
		const averageHours = (averageMinutes / 60).toFixed(2);

		addIssue(
			results[window[window.length - 1].index].issues,
			'AVG_WORKING_TIME_7_WORKDAYS_EXCEEDED',
			`Durchschnitt der letzten 7 Arbeitstage (${windowStart} bis ${windowEnd}) beträgt ${averageHours}h und überschreitet 9h.`
		);
	}
}

function applySingleRuhetagDurationChecks(sorted: AssignedTour[], results: TourDayValidation[]) {
	const indexedEntries = sorted.map((entry, index) => ({
		entry,
		index,
		dayNumber: toDayNumber(entry.datum)
	}));

	for (let start = 0; start < indexedEntries.length; ) {
		if (!isRuhetagType(indexedEntries[start].entry.abkuerzung)) {
			start += 1;
			continue;
		}

		let end = start;
		while (
			end + 1 < indexedEntries.length &&
			isRuhetagType(indexedEntries[end + 1].entry.abkuerzung) &&
			indexedEntries[end + 1].dayNumber - indexedEntries[end].dayNumber === 1
		) {
			end += 1;
		}

		const firstRt = indexedEntries[start];
		let previousDutyEnd: Date | null = null;
		for (let p = start - 1; p >= 0; p -= 1) {
			if (!isDutyEntry(indexedEntries[p].entry)) {
				continue;
			}

			previousDutyEnd = new Date(indexedEntries[p].entry.endTime!);
			break;
		}

		if (start === end && previousDutyEnd) {
			let nextDutyStart: Date | null = null;
			for (let n = end + 1; n < indexedEntries.length; n += 1) {
				if (!isDutyEntry(indexedEntries[n].entry)) {
					continue;
				}

				nextDutyStart = new Date(indexedEntries[n].entry.startTime!);
				break;
			}

			if (nextDutyStart) {
				const singleRtTotalMinutes = Math.floor(
					(nextDutyStart.getTime() - previousDutyEnd.getTime()) / 60000
				);

				if (singleRtTotalMinutes < MIN_SINGLE_RT_TOTAL_MINUTES_WITH_MITENTSCHEID) {
					addIssue(
						results[firstRt.index].issues,
						'RT_SINGLE_TOTAL_DURATION_TOO_SHORT',
						`Ein einzelner RT muss insgesamt mindestens 33h umfassen (aktuell ${(singleRtTotalMinutes / 60).toFixed(2)}h).`
					);
				} else if (singleRtTotalMinutes < MIN_SINGLE_RT_TOTAL_MINUTES) {
					addIssue(
						results[firstRt.index].issues,
						'RT_SINGLE_TOTAL_DURATION_MITENTSCHEID',
						`Einzelner RT liegt unter 36h und ist nur mit Mitentscheid zulässig (aktuell ${(singleRtTotalMinutes / 60).toFixed(2)}h).`,
						'error',
						true
					);
				}
			}
		}

		start = end + 1;
	}
}

export function validateTourenByDay(entries: AssignedTour[]): TourDayValidation[] {
	const sorted = [...entries].sort((a, b) => a.datum - b.datum);
	const results: TourDayValidation[] = [];
	const state = createInitialValidationState();

	for (const entry of sorted) {
		const dayNumber = toDayNumber(entry.datum);
		const issues: ValidationIssue[] = [];
		const label = toTourLabel(entry);

		if (!hasDutyData(entry)) {
			resetStateForNoDutyData(state);
			results.push(createResult(entry, issues));
			continue;
		}

		const dayOff = isDayOffType(entry.abkuerzung);
		const reserve = isReserveType(entry.abkuerzung);
		const nightBoundaryTour = validateNightBoundary(entry, label, dayNumber, issues, state);

		if ((dayOff || reserve) && (entry.startTime || entry.endTime)) {
			addIssue(
				issues,
				'NON_WORKING_WITH_TIMES',
				`${label}: Tagtyp ohne Soll-Einsatz darf keine Start-/Endzeit enthalten.`
			);
		}

		if (!dayOff && !reserve) {
			validateSpecialWorkRange(entry, label, dayNumber, nightBoundaryTour, issues, state);

			if (entry.arbeitszeit != null && entry.arbeitszeit < MIN_WORKING_TIME_PER_SHIFT_MINUTES) {
				addIssue(
					issues,
					'WORKING_TIME_BELOW_MINIMUM_SHIFT',
					`${label}: Arbeitsschichten mit weniger als 6 Stunden Arbeitszeit sind ohne Mitentscheid nicht zulässig.`,
					'error',
					true
				);
			}

			validateDutyBoundaries(entry, label, issues, state);
		} else {
			resetStateForDayOffOrReserve(state);
		}

		validateDurations(entry, label, issues);
		results.push(createResult(entry, issues));
	}

	applySevenDayAverageChecks(sorted, results);
	applySingleRuhetagDurationChecks(sorted, results);

	for (const result of results) {
		result.status = result.issues.length > 0 ? 'invalid' : 'valid';
	}

	return results;
}
