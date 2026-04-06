import type { CalendarDay, CalendarMonth, TourEntry } from './touren-types';

const dayKey = (date: Date) => {
	const y = date.getFullYear();
	const m = `${date.getMonth() + 1}`.padStart(2, '0');
	const d = `${date.getDate()}`.padStart(2, '0');
	return `${y}-${m}-${d}`;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const isSameDay = (a: Date, b: Date) =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();

export const buildCalendarMonths = (
	touren: TourEntry[],
	referenceDate = new Date()
): CalendarMonth[] => {
	const today = startOfDay(referenceDate);
	const sortedTouren = [...touren].sort((a, b) => a.datum - b.datum);
	const tourByDay: Record<string, TourEntry> = {};

	for (const tour of sortedTouren) {
		tourByDay[dayKey(startOfDay(new Date(tour.datum)))] = tour;
	}

	const firstTourDate = sortedTouren[0] ? startOfDay(new Date(sortedTouren[0].datum)) : today;
	const lastTourDate = sortedTouren.at(-1)
		? startOfDay(new Date(sortedTouren.at(-1)!.datum))
		: today;

	const startDate = startOfMonth(firstTourDate < today ? firstTourDate : today);
	const endDate = startOfMonth(lastTourDate > today ? lastTourDate : today);

	const months: CalendarMonth[] = [];
	let year = startDate.getFullYear();
	let monthIndex = startDate.getMonth();

	while (
		year < endDate.getFullYear() ||
		(year === endDate.getFullYear() && monthIndex <= endDate.getMonth())
	) {
		const monthStart = new Date(year, monthIndex, 1);
		const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
		const leadingOffset = (monthStart.getDay() + 6) % 7;
		const totalCells = Math.ceil((leadingOffset + monthEnd.getDate()) / 7) * 7;
		const gridStart = addDays(monthStart, -leadingOffset);

		const days: CalendarDay[] = [];
		for (let i = 0; i < totalCells; i++) {
			const date = addDays(gridStart, i);
			days.push({
				key: dayKey(date),
				date,
				inCurrentMonth: date.getMonth() === monthStart.getMonth(),
				isToday: isSameDay(date, today),
				tour: tourByDay[dayKey(date)]
			});
		}

		const weeks: CalendarDay[][] = [];
		for (let i = 0; i < days.length; i += 7) {
			weeks.push(days.slice(i, i + 7));
		}

		months.push({
			id: `month-${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`,
			label: new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' }).format(
				monthStart
			),
			weeks
		});

		monthIndex += 1;
		if (monthIndex > 11) {
			monthIndex = 0;
			year += 1;
		}
	}

	return months;
};
