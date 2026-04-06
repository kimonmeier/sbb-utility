export type TourEntry = {
	id: string;
	datum: number;
	abkuerzung?: string | null;
	tourNumber?: number | null;
	tourSuffix?: string | null;
	aenderungKommentar?: string | null;
	schichtdauer?: number | null;
	arbeitszeit?: number | null;
	bezahlteZeit?: number | null;
	bezahltePause?: number | null;
	depot?: string | null;
	lastEdited?: number | Date | null;
	startTime?: number | Date | null;
	endTime?: number | Date | null;
};

export type CalendarDay = {
	key: string;
	date: Date;
	inCurrentMonth: boolean;
	isToday: boolean;
	tour?: TourEntry;
};

export type CalendarMonth = {
	id: string;
	label: string;
	weeks: CalendarDay[][];
};
