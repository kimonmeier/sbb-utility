import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
	tokens,
	touren,
	zeitkontenSnapshots,
	type SBBUtilityTouren,
	type SBBUtilityZeitkontoSnapshot
} from '../db/schema';
import { sbbClient, toUserFacingSbbError } from './sbb-client';
import { SopreDepot, SopreTourType, type SopreMonthsRequest } from '../../types/SopreTypes';

export async function synchronizeTouren(userId: string) {
	// This function can be called to trigger synchronization of touren data.
	// You can implement the logic to fetch new touren data from the SBB API
	// and update your database accordingly.

	const token = await db.query.tokens.findFirst({
		where: eq(tokens.userId, userId),
		orderBy: [desc(tokens.expiresAt)]
	});

	if (token?.expiresAt && token.expiresAt.getTime() < Date.now()) {
		// Token is invalid, proceed with synchronization
		throw new Error('Token has expired. Please provide a valid token to synchronize touren.');
	}

	// Example: Fetch touren data for the current year
	const currentYear = new Date().getFullYear();
	const sbbToken = token?.token;

	if (!sbbToken) {
		throw new Error('No valid token found for user. Please provide a token to synchronize touren.');
	}
	let tourenData: SopreMonthsRequest;
	try {
		tourenData = await sbbClient.getYear(sbbToken, currentYear);
	} catch (error) {
		throw new Error(toUserFacingSbbError(error, 'Failed to fetch touren data from SBB API.'), {
			cause: error
		});
	}

	console.log('Fetched touren data from SBB API:', tourenData);

	const sourceTourItems = flattenTourItems(tourenData);
	const uniqueTourItemsByDay = new Map<number, (typeof sourceTourItems)[number]>();
	for (const item of sourceTourItems) {
		uniqueTourItemsByDay.set(Date.parse(item.date), item);
	}

	const uniqueTourItems = Array.from(uniqueTourItemsByDay.values());
	if (uniqueTourItems.length === 0) {
		return;
	}

	const allDays = Array.from(uniqueTourItemsByDay.keys());
	const existingTouren = await db.query.touren.findMany({
		where: and(eq(touren.user, userId), inArray(touren.datum, allDays))
	});
	const existingTourenByDay = new Map(existingTouren.map((tour) => [tour.datum, tour]));

	const processedTouren = await processTourenData(
		uniqueTourItems,
		userId,
		sbbToken,
		existingTourenByDay
	);

	if (processedTouren.length === 0) {
		return;
	}

	// Keep one entry per day. If the API sends duplicates for one day, the latest one wins.
	const tourenByDay = new Map<number, SBBUtilityTouren>();
	for (const tour of processedTouren) {
		tourenByDay.set(tour.datum, tour);
	}

	const uniqueTouren = Array.from(tourenByDay.values());

	const existingDays = new Set(existingTouren.map((tour) => tour.datum));
	const toInsert = uniqueTouren.filter((tour) => !existingDays.has(tour.datum));
	const toUpdate = uniqueTouren.filter((tour) => existingDays.has(tour.datum));

	if (toInsert.length > 0) {
		await db.insert(touren).values(toInsert);
	}

	if (toUpdate.length > 0) {
		await Promise.all(
			toUpdate.map((tour) =>
				db
					.update(touren)
					.set({
						abkuerzung: tour.abkuerzung,
						tourNumber: tour.tourNumber,
						depot: tour.depot,
						lastEdited: tour.lastEdited,
						startTime: tour.startTime,
						endTime: tour.endTime,
						aenderungKommentar: tour.aenderungKommentar,
						tourSuffix: tour.tourSuffix,
						schichtdauer: tour.schichtdauer,
						arbeitszeit: tour.arbeitszeit,
						bezahlteZeit: tour.bezahlteZeit,
						bezahltePause: tour.bezahltePause
					})
					.where(and(eq(touren.user, userId), eq(touren.datum, tour.datum)))
			)
		);
	}

	await synchronizeZeitkonten(userId, sbbToken);
}

const INTERESTING_ZEITKONTEN_IDS = new Set(['5', '9040', '9046', '9047']);

async function synchronizeZeitkonten(userId: string, token: string) {
	let zeitkontenData;
	try {
		zeitkontenData = await sbbClient.getZeitkontenPeriod(token);
	} catch (error) {
		throw new Error(toUserFacingSbbError(error, 'Failed to fetch Zeitkonten data from SBB API.'), {
			cause: error
		});
	}

	const currentSnapshotDate = new Date().toISOString().slice(0, 10);
	const selectedEntries = zeitkontenData.filter((entry) =>
		INTERESTING_ZEITKONTEN_IDS.has(entry.sapLeaveTypeId)
	);

	if (selectedEntries.length === 0) {
		return;
	}

	await db
		.delete(zeitkontenSnapshots)
		.where(
			and(
				eq(zeitkontenSnapshots.user, userId),
				eq(zeitkontenSnapshots.snapshotDate, currentSnapshotDate)
			)
		);

	const snapshots: SBBUtilityZeitkontoSnapshot[] = selectedEntries.map((entry) => ({
		id: crypto.randomUUID(),
		user: userId,
		snapshotDate: currentSnapshotDate,
		sapLeaveTypeId: entry.sapLeaveTypeId,
		zeitsaldoBeschreibung: entry.zeitsaldoBeschreibung,
		anzahl: entry.anzahl
	}));

	await db.insert(zeitkontenSnapshots).values(snapshots);
}

async function processTourenData(
	tourItems: ReturnType<typeof flattenTourItems>,
	userId: string,
	token: string,
	existingTourenByDay: Map<number, typeof touren.$inferSelect>
): Promise<SBBUtilityTouren[]> {
	return Promise.all(
		tourItems.map(async (item) => {
			const tour: SBBUtilityTouren = {
				id: crypto.randomUUID(),
				datum: Date.parse(item.date),
				user: userId,
				abkuerzung: SopreTourType.UNBEKANNT
			};
			const existingTour = existingTourenByDay.get(tour.datum);

			if (item.dayOff) {
				tour.abkuerzung = parseTourType(item.abkuerzung!);
			} else {
				if (item.tournummer) {
					const endTime = new Date(Date.parse(`${item.date} ${item.tourEndzeit}`));
					if (item.tourEndsNextDay) {
						endTime.setDate(endTime.getDate() + 1);
					}

					tour.tourNumber = parseInt(item.tournummer);
					tour.startTime = new Date(Date.parse(`${item.date} ${item.tourStartzeit}`));
					tour.endTime = endTime;
					tour.depot = parseStandort(item.startStandort);
					tour.tourSuffix = item.tourSuffix;

					if (existingTour && isSameBaseTour(existingTour, tour)) {
						copyPersistedDetailFields(existingTour, tour);
						return tour;
					}

					let tourDetail = null;
					if (item.mitarbeiterTourId) {
						try {
							tourDetail = await sbbClient.getTourDetail(token, item.mitarbeiterTourId);
						} catch (error) {
							console.warn(
								`Skipping tour detail fetch for mitarbeiterTourId ${item.mitarbeiterTourId}:`,
								toUserFacingSbbError(error, 'Failed to fetch tour detail from SBB API.')
							);
						}
					}

					if (tourDetail?.tourdetailDTO) {
						tour.schichtdauer = parseDurationToMinutes(tourDetail.tourdetailDTO.schichtdauer);
						tour.arbeitszeit = parseDurationToMinutes(tourDetail.tourdetailDTO.arbeitszeit);
						tour.bezahlteZeit = parseDurationToMinutes(tourDetail.tourdetailDTO.bezahlteZeit);
						tour.bezahltePause = parseDurationToMinutes(tourDetail.tourdetailDTO.bezahltePause);
					}

					if (tourDetail?.zuteilungsbemerkung) {
						tour.aenderungKommentar = tourDetail.zuteilungsbemerkung;
					}
				} else {
					if (item.reservetypBeschreibung) {
						tour.abkuerzung = SopreTourType.RESERVE;
					}

					if (item.schichtlage) {
						if (item.schichtlage.includes('FRUEH')) {
							tour.abkuerzung = SopreTourType.RESERVE_FRÜH;
						} else if (item.schichtlage.includes('SPAET')) {
							tour.abkuerzung = SopreTourType.RESERVE_SPÄT;
						}
					}

					if (item.lastEdit) {
						tour.lastEdited = new Date(Date.parse(item.lastEdit));
					}
				}
			}

			return tour;
		})
	);
}

function flattenTourItems(tourenData: SopreMonthsRequest) {
	return tourenData.flatMap((month) =>
		month.weekDTOs.flatMap((week) => week.dayDTOs.flatMap((day) => day.dayItemDTOs || []))
	);
}

function toTimestamp(value: Date | null | undefined): number | null {
	if (!value) {
		return null;
	}

	return value.getTime();
}

function isSameBaseTour(existingTour: typeof touren.$inferSelect, nextTour: SBBUtilityTouren) {
	return (
		existingTour.abkuerzung === nextTour.abkuerzung &&
		existingTour.tourNumber === nextTour.tourNumber &&
		existingTour.tourSuffix === nextTour.tourSuffix &&
		existingTour.depot === nextTour.depot &&
		toTimestamp(existingTour.startTime) === toTimestamp(nextTour.startTime) &&
		toTimestamp(existingTour.endTime) === toTimestamp(nextTour.endTime) &&
		toTimestamp(existingTour.lastEdited) === toTimestamp(nextTour.lastEdited)
	);
}

function copyPersistedDetailFields(
	existingTour: typeof touren.$inferSelect,
	nextTour: SBBUtilityTouren
) {
	nextTour.schichtdauer = existingTour.schichtdauer ?? undefined;
	nextTour.arbeitszeit = existingTour.arbeitszeit ?? undefined;
	nextTour.bezahlteZeit = existingTour.bezahlteZeit ?? undefined;
	nextTour.bezahltePause = existingTour.bezahltePause ?? undefined;
	nextTour.aenderungKommentar = existingTour.aenderungKommentar ?? undefined;
}

function parseStandort(standort: string | undefined): SopreDepot {
	if (!standort) {
		return SopreDepot.UNBEKANNT;
	}

	if (standort === 'OL') {
		return SopreDepot.OLTEN;
	}
	return SopreDepot.UNBEKANNT;
}

function parseTourType(abkuerzung: string): SopreTourType {
	if (abkuerzung == 'K') {
		return SopreTourType.KRANK;
	} else if (abkuerzung == 'RT') {
		return SopreTourType.RUHETAGE;
	} else if (abkuerzung == 'CT') {
		return SopreTourType.KOMPENSATIONSTAG;
	} else if (abkuerzung == 'RTV') {
		return SopreTourType.RUHETAG_VERLANGT;
	} else if (abkuerzung == 'RTT') {
		return SopreTourType.RUHETAG_TAUSCH;
	} else if (abkuerzung == 'CTV') {
		return SopreTourType.KOMPENSATIONSTAG_VERLANGT;
	} else if (abkuerzung == 'CTT') {
		return SopreTourType.KOMPENSATIONSTAG_TAUSCH;
	} else if (abkuerzung == 'RTP') {
		return SopreTourType.GUTHABEN_RUHETAG_PERSONAL;
	} else if (abkuerzung == 'F') {
		return SopreTourType.FERIEN;
	} else {
		return SopreTourType.UNBEKANNT;
	}
}

function parseDurationToMinutes(value?: string | null): number | undefined {
	if (!value) {
		return undefined;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}

	if (/^\d+$/.test(trimmed)) {
		return parseInt(trimmed, 10);
	}

	const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (hhmmMatch) {
		const hours = parseInt(hhmmMatch[1], 10);
		const minutes = parseInt(hhmmMatch[2], 10);
		const seconds = hhmmMatch[3] ? parseInt(hhmmMatch[3], 10) : 0;
		return hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
	}

	const isoMatch = trimmed.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
	if (isoMatch) {
		const hours = isoMatch[1] ? parseInt(isoMatch[1], 10) : 0;
		const minutes = isoMatch[2] ? parseInt(isoMatch[2], 10) : 0;
		return hours * 60 + minutes;
	}

	const humanMatch = trimmed.match(/^(\d+)\s*h(?:\s*(\d+)\s*m?)?$/i);
	if (humanMatch) {
		const hours = parseInt(humanMatch[1], 10);
		const minutes = humanMatch[2] ? parseInt(humanMatch[2], 10) : 0;
		return hours * 60 + minutes;
	}

	return undefined;
}
