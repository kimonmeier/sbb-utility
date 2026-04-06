import { redirect } from '@sveltejs/kit';
import { and, asc, eq, gt, gte, inArray, lt } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { touren, zeitkontenSnapshots } from '$lib/server/db/schema';
import { SopreTourType } from '$lib/types/SopreTypes';

const TRACKED_ACCOUNT_IDS = ['5', '9040', '9046', '9047'] as const;
const TARGET_MINUTES_PER_DAY = 8.2 * 60;

type AccountId = (typeof TRACKED_ACCOUNT_IDS)[number];

type ProjectionRule =
	| 'RT -> 9047 (-1)'
	| 'CT -> 9046 (-1)'
	| 'Ferienregel -> 9040 (-1 Arbeitstag)'
	| 'Ferienregel -> 9046 (-1 Ausgleichstag)'
	| 'Ferienregel -> 9047 (-1 Ruhetag)'
	| 'Schaetzung Zyklusregel -> 9046 (-1 Ausgleichstag)'
	| 'Schaetzung Zyklusregel -> 9047 (-1 Ruhetag)'
	| 'Reserve -> 5 (fix 8.2h)'
	| 'Arbeitszeit -> 5 (bezahlteZeit - 8.2h)';

interface HistoryPoint {
	snapshotDate: string;
	accountId: AccountId;
	description: string;
	value: number;
}

interface ProjectionEvent {
	date: string;
	tourLabel: string;
	accountId: AccountId;
	rule: ProjectionRule;
	delta: number;
	resultBalance: number;
}

interface RestDayEstimate {
	date: string;
	type: 'RT' | 'CT';
	reason: string;
}

function parseBalance(value: string): number {
	const normalized = value.replace(',', '.').trim();
	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? parsed : 0;
}

function toDateString(timestampMs: number): string {
	return new Date(timestampMs).toISOString().slice(0, 10);
}

function toUtcDayNumberFromDateKey(dateKey: string): number {
	return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
}

function toDateKeyFromUtcDayNumber(dayNumber: number): string {
	return new Date(dayNumber * 86400000).toISOString().slice(0, 10);
}

function countSaturdaysInYear(year: number): number {
	let count = 0;
	for (let month = 0; month < 12; month += 1) {
		const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
		for (let day = 1; day <= daysInMonth; day += 1) {
			const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
			if (weekday === 6) {
				count += 1;
			}
		}
	}

	return count;
}

function toTourLabel(tour: typeof touren.$inferSelect): string {
	if (tour.tourNumber) {
		return `Tour ${tour.tourNumber}${tour.tourSuffix ? ` ${tour.tourSuffix}` : ''}`;
	}

	if (tour.abkuerzung) {
		return tour.abkuerzung;
	}

	return 'Unbekannte Tour';
}

function isRuhetagType(type?: string | null): boolean {
	return (
		type === SopreTourType.RUHETAGE ||
		type === SopreTourType.RUHETAG_VERLANGT ||
		type === SopreTourType.RUHETAG_TAUSCH
	);
}

function isKompensationstagType(type?: string | null): boolean {
	return (
		type === SopreTourType.KOMPENSATIONSTAG ||
		type === SopreTourType.KOMPENSATIONSTAG_VERLANGT ||
		type === SopreTourType.KOMPENSATIONSTAG_TAUSCH
	);
}

function isReserveType(type?: string | null): boolean {
	return (
		type === SopreTourType.RESERVE ||
		type === SopreTourType.RESERVE_FRÜH ||
		type === SopreTourType.RESERVE_SPÄT
	);
}

function collectFerienChargeTargets(
	futureTours: Array<typeof touren.$inferSelect>
): Map<number, '9040' | '9046' | '9047'> {
	const ferienDays = futureTours
		.filter((entry) => entry.abkuerzung === SopreTourType.FERIEN)
		.map((entry) => entry.datum)
		.sort((a, b) => a - b);

	const chunks: number[][] = [];
	let current: number[] = [];

	for (const day of ferienDays) {
		const previous = current.at(-1);
		const isConsecutive = previous != null && day - previous <= 24 * 60 * 60 * 1000 + 1;

		if (current.length === 0 || isConsecutive) {
			current.push(day);
			continue;
		}

		chunks.push(current);
		current = [day];
	}

	if (current.length > 0) {
		chunks.push(current);
	}

	const chargeTargets = new Map<number, '9040' | '9046' | '9047'>();

	for (const chunk of chunks) {
		const firstWeekWindow = chunk.slice(0, 8);
		for (const day of firstWeekWindow.slice(0, 5)) {
			chargeTargets.set(day, '9040');
		}
		for (const day of firstWeekWindow.slice(5, 7)) {
			chargeTargets.set(day, '9046');
		}
		for (const day of firstWeekWindow.slice(7, 8)) {
			chargeTargets.set(day, '9047');
		}

		let index = 8;

		while (index < chunk.length) {
			const nextWeekWindow = chunk.slice(index, index + 7);
			for (const day of nextWeekWindow.slice(0, 5)) {
				chargeTargets.set(day, '9040');
			}
			for (const day of nextWeekWindow.slice(5, 6)) {
				chargeTargets.set(day, '9046');
			}
			for (const day of nextWeekWindow.slice(6, 7)) {
				chargeTargets.set(day, '9047');
			}
			index += 7;
		}
	}

	return chargeTargets;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	const snapshots = await db.query.zeitkontenSnapshots.findMany({
		where: and(
			eq(zeitkontenSnapshots.user, locals.user.id),
			inArray(zeitkontenSnapshots.sapLeaveTypeId, [...TRACKED_ACCOUNT_IDS])
		),
		orderBy: [asc(zeitkontenSnapshots.snapshotDate), asc(zeitkontenSnapshots.capturedAt)]
	});

	const history: HistoryPoint[] = snapshots
		.map((row) => ({
			snapshotDate: row.snapshotDate,
			accountId: row.sapLeaveTypeId as AccountId,
			description: row.zeitsaldoBeschreibung,
			value: parseBalance(row.anzahl)
		}))
		.sort((a, b) => {
			if (a.snapshotDate === b.snapshotDate) {
				return a.accountId.localeCompare(b.accountId);
			}
			return a.snapshotDate.localeCompare(b.snapshotDate);
		});

	const latestBalances = new Map<AccountId, { description: string; value: number }>();
	for (const point of history) {
		latestBalances.set(point.accountId, {
			description: point.description,
			value: point.value
		});
	}

	const latestSnapshotDate = history.at(-1)?.snapshotDate;
	const projectionStartTimestamp = latestSnapshotDate
		? Date.parse(latestSnapshotDate) + 24 * 60 * 60 * 1000
		: Date.now();

	const futureTours = await db.query.touren.findMany({
		where: and(eq(touren.user, locals.user.id), gt(touren.datum, projectionStartTimestamp)),
		orderBy: [asc(touren.datum)]
	});

	const currentYear = new Date().getUTCFullYear();
	const yearStartDateKey = `${currentYear}-01-01`;
	const yearEndDateKey = `${currentYear}-12-31`;
	const yearStartTimestamp = Date.parse(`${yearStartDateKey}T00:00:00Z`);
	const nextYearStartTimestamp = Date.parse(`${currentYear + 1}-01-01T00:00:00Z`);

	const toursInCurrentYear = await db.query.touren.findMany({
		where: and(
			eq(touren.user, locals.user.id),
			gte(touren.datum, yearStartTimestamp),
			lt(touren.datum, nextYearStartTimestamp)
		),
		orderBy: [asc(touren.datum)]
	});
	const ferienChargeTargets = collectFerienChargeTargets(futureTours);

	const projected = new Map<AccountId, number>();
	for (const accountId of TRACKED_ACCOUNT_IDS) {
		projected.set(accountId, latestBalances.get(accountId)?.value ?? 0);
	}

	const projectionEvents: ProjectionEvent[] = [];
	const ignoredFutureTours: Array<{ date: string; tourLabel: string; reason: string }> = [];

	for (const tour of futureTours) {
		const date = toDateString(tour.datum);
		const tourLabel = toTourLabel(tour);

		if (isRuhetagType(tour.abkuerzung)) {
			const next = (projected.get('9047') ?? 0) - 1;
			projected.set('9047', next);
			projectionEvents.push({
				date,
				tourLabel,
				accountId: '9047',
				rule: 'RT -> 9047 (-1)',
				delta: -1,
				resultBalance: next
			});
			continue;
		}

		if (isKompensationstagType(tour.abkuerzung)) {
			const next = (projected.get('9046') ?? 0) - 1;
			projected.set('9046', next);
			projectionEvents.push({
				date,
				tourLabel,
				accountId: '9046',
				rule: 'CT -> 9046 (-1)',
				delta: -1,
				resultBalance: next
			});
			continue;
		}

		if (tour.abkuerzung === SopreTourType.FERIEN) {
			const targetAccount = ferienChargeTargets.get(tour.datum);
			if (!targetAccount) {
				ignoredFutureTours.push({
					date,
					tourLabel,
					reason: 'Ferien-Tag konnte nicht zugeordnet werden'
				});
				continue;
			}

			const next = (projected.get(targetAccount) ?? 0) - 1;
			projected.set(targetAccount, next);
			const rule: ProjectionRule =
				targetAccount === '9040'
					? 'Ferienregel -> 9040 (-1 Arbeitstag)'
					: targetAccount === '9046'
						? 'Ferienregel -> 9046 (-1 Ausgleichstag)'
						: 'Ferienregel -> 9047 (-1 Ruhetag)';
			projectionEvents.push({
				date,
				tourLabel,
				accountId: targetAccount,
				rule,
				delta: -1,
				resultBalance: next
			});
			continue;
		}

		if (isReserveType(tour.abkuerzung)) {
			const delta = 0;
			const next = (projected.get('5') ?? 0) + delta;
			projected.set('5', next);
			projectionEvents.push({
				date,
				tourLabel,
				accountId: '5',
				rule: 'Reserve -> 5 (fix 8.2h)',
				delta,
				resultBalance: next
			});
			continue;
		}

		if (tour.bezahlteZeit == null) {
			ignoredFutureTours.push({
				date,
				tourLabel,
				reason: 'bezahlteZeit nicht vorhanden'
			});
			continue;
		}

		const delta = (tour.bezahlteZeit - TARGET_MINUTES_PER_DAY) / 60;
		const next = (projected.get('5') ?? 0) + delta;
		projected.set('5', next);
		projectionEvents.push({
			date,
			tourLabel,
			accountId: '5',
			rule: 'Arbeitszeit -> 5 (bezahlteZeit - 8.2h)',
			delta,
			resultBalance: next
		});
	}

	const yearStartDayNumber = toUtcDayNumberFromDateKey(yearStartDateKey);
	const yearEndDayNumber = toUtcDayNumberFromDateKey(yearEndDateKey);

	const assignedTourByDateKey = new Map<string, typeof touren.$inferSelect>();
	for (const assignedTour of toursInCurrentYear) {
		assignedTourByDateKey.set(toDateString(assignedTour.datum), assignedTour);
	}

	const estimatedRestDays: RestDayEstimate[] = [];

	let estimatedRtCount = 0;
	let estimatedCtCount = 0;

	const knownRtCount = toursInCurrentYear.filter((tour) => isRuhetagType(tour.abkuerzung)).length;
	const knownCtCount = toursInCurrentYear.filter((tour) =>
		isKompensationstagType(tour.abkuerzung)
	).length;

	const ferienChargeTargetsYear = collectFerienChargeTargets(toursInCurrentYear);
	let ferienRtCount = 0;
	let ferienCtCount = 0;
	for (const tour of toursInCurrentYear) {
		if (tour.abkuerzung !== SopreTourType.FERIEN) {
			continue;
		}

		const target = ferienChargeTargetsYear.get(tour.datum);
		if (target === '9047') {
			ferienRtCount += 1;
		}
		if (target === '9046') {
			ferienCtCount += 1;
		}
	}

	const saturdaysInYear = countSaturdaysInYear(currentYear);
	const has53Saturdays = saturdaysInYear === 53;
	const expectedRtCount = 63;
	const expectedCtCount = has53Saturdays ? 53 : 52;

	for (let dayNumber = yearStartDayNumber; dayNumber <= yearEndDayNumber; dayNumber += 1) {
		const dateKey = toDateKeyFromUtcDayNumber(dayNumber);
		const cyclePosition = (dayNumber - yearStartDayNumber) % 7;

		const isCycleCtDay = cyclePosition === 5;
		const isCycleRtDay = cyclePosition === 6;

		if (assignedTourByDateKey.has(dateKey)) {
			continue;
		}

		if (isCycleCtDay) {
			estimatedCtCount += 1;
			estimatedRestDays.push({
				date: dateKey,
				type: 'CT',
				reason: 'Ganzjahres-Zyklusregel: 5 Arbeitstage, dann 1 CT, dann 1 RT'
			});
		}

		if (isCycleRtDay) {
			estimatedRtCount += 1;
			estimatedRestDays.push({
				date: dateKey,
				type: 'RT',
				reason: 'Ganzjahres-Zyklusregel: 5 Arbeitstage, dann 1 CT, dann 1 RT'
			});
		}
	}

	const totalRtCount = knownRtCount + estimatedRtCount + ferienRtCount;
	const totalCtCount = knownCtCount + estimatedCtCount + ferienCtCount;
	const missingRtWithoutEstimate = expectedRtCount - (knownRtCount + ferienRtCount);
	const missingCtWithoutEstimate = expectedCtCount - (knownCtCount + ferienCtCount);
	const missingRtWithEstimate = expectedRtCount - totalRtCount;
	const missingCtWithEstimate = expectedCtCount - totalCtCount;
	const missingCombinedWithEstimate =
		expectedRtCount + expectedCtCount - (totalRtCount + totalCtCount);

	const restDayCalculator = {
		year: currentYear,
		fullYearRange: {
			from: yearStartDateKey,
			to: yearEndDateKey
		},
		estimateRange:
			estimatedRestDays.length > 0
				? {
						from: estimatedRestDays[0].date,
						to: estimatedRestDays[estimatedRestDays.length - 1].date
					}
				: null,
		knownRtCount,
		knownCtCount,
		saturdaysInYear,
		has53Saturdays,
		expectedRtCount,
		expectedCtCount,
		estimatedRtCount,
		estimatedCtCount,
		ferienRtCount,
		ferienCtCount,
		totalRtCount,
		totalCtCount,
		projectedRtBalanceWithoutEstimate: missingRtWithoutEstimate,
		projectedCtBalanceWithoutEstimate: missingCtWithoutEstimate,
		projectedRtBalanceWithEstimate: missingRtWithEstimate,
		projectedCtBalanceWithEstimate: missingCtWithEstimate,
		projectedCombinedBalanceWithEstimate: missingCombinedWithEstimate,
		estimatedRestDays
	};

	return {
		history,
		latestSnapshotDate,
		projectionEvents,
		ignoredFutureTours,
		restDayCalculator,
		projectedBalances: TRACKED_ACCOUNT_IDS.map((accountId) => ({
			accountId,
			description: latestBalances.get(accountId)?.description ?? `Zeitkonto ${accountId}`,
			base: latestBalances.get(accountId)?.value ?? 0,
			projected: projected.get(accountId) ?? 0
		}))
	};
};
