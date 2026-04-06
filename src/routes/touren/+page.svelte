<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData, PageData } from './$types';
	import TourenPageTopbar from '$lib/components/touren/TourenPageTopbar.svelte';
	import TourenCalendar from '$lib/components/touren/TourenCalendar.svelte';
	import TourenDetailsDrawer from '$lib/components/touren/TourenDetailsDrawer.svelte';
	import { buildCalendarMonths } from '$lib/components/touren/touren-calendar.utils';
	import type { CalendarMonth, TourEntry } from '$lib/components/touren/touren-types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let isSyncing = $state(false);
	let selectedTour = $state<TourEntry | null>(null);
	let selectedTourDay = $state<Date | null>(null);
	const TODAY_CELL_ID = 'touren-heute';

	type Tour = TourEntry;

	const enhanceSync: SubmitFunction = () => {
		isSyncing = true;

		return async ({ result, update }) => {
			try {
				if (result.type === 'success' || result.type === 'failure') {
					await update();
				}

				if (result.type === 'success') {
					await invalidateAll();
				}
			} finally {
				isSyncing = false;
			}
		};
	};

	const formatDayNumber = (value: Date) =>
		new Intl.DateTimeFormat('de-CH', { day: '2-digit' }).format(value);

	const formatDateLabel = (value: number | Date) =>
		new Intl.DateTimeFormat('de-CH', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		}).format(value instanceof Date ? value : new Date(value));

	const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

	const formatTime = (value?: number | Date | null) =>
		value
			? new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit' }).format(
					value instanceof Date ? value : new Date(value)
				)
			: '—';

	const getTourLabel = (tour: Tour) => {
		if (tour.tourNumber) {
			return `Tour ${tour.tourNumber} ${tour.tourSuffix ?? ''}`.trim();
		}

		if (tour.abkuerzung) {
			return tour.abkuerzung;
		}

		return 'Unbenannte Tour';
	};

	const openTourDetails = (tour: Tour, day: Date) => {
		selectedTour = tour;
		selectedTourDay = day;
	};

	const closeTourDetails = () => {
		selectedTour = null;
		selectedTourDay = null;
	};

	const calendarMonths = $derived.by<CalendarMonth[]>(() =>
		buildCalendarMonths(data.touren as Tour[])
	);

	onMount(() => {
		const todayCell = document.getElementById(TODAY_CELL_ID);
		if (!todayCell) {
			return;
		}

		requestAnimationFrame(() => {
			todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});

		const onEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				closeTourDetails();
			}
		};

		window.addEventListener('keydown', onEscape);

		return () => {
			window.removeEventListener('keydown', onEscape);
		};
	});
</script>

<svelte:head>
	<title>Meine Touren</title>
	<meta name="description" content="Overview of all tours assigned to the logged in user." />
</svelte:head>

<div class="mx-auto w-full max-w-6xl grow px-4 py-10">
	<TourenPageTopbar {isSyncing} {enhanceSync} />

	{#if isSyncing}
		<div class="mb-6">
			<progress class="progress w-full progress-primary"></progress>
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-6 alert alert-error">
			<span>{form.error}</span>
		</div>
	{/if}

	{#if data.touren.length === 0}
		<div class="mb-6 rounded-box border border-base-300 bg-base-200 p-4 text-sm">
			Keine Touren gefunden. Der Kalender zeigt dir trotzdem den aktuellen Monat.
		</div>
	{/if}

	<TourenCalendar
		{calendarMonths}
		{weekdayLabels}
		{TODAY_CELL_ID}
		{formatDayNumber}
		{formatTime}
		{getTourLabel}
		onSelectTour={openTourDetails}
	/>
</div>

<TourenDetailsDrawer
	{selectedTour}
	{selectedTourDay}
	{closeTourDetails}
	{formatDateLabel}
	{formatTime}
	{getTourLabel}
/>
