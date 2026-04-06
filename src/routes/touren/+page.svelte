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
	import { m } from '$lib/paraglide/messages.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let isSyncing = $state(false);
	let showSlowSyncMessage = $state(false);
	let showSyncCompleteMessage = $state(false);
	let selectedTour = $state<TourEntry | null>(null);
	let selectedTourDay = $state<Date | null>(null);
	const TODAY_CELL_ID = 'touren-heute';
	const SLOW_SYNC_DELAY_MS = 60_000;
	const SYNC_COMPLETE_ALERT_MS = 5_000;
	let slowSyncTimer: ReturnType<typeof setTimeout> | null = null;
	let syncCompleteTimer: ReturnType<typeof setTimeout> | null = null;

	type Tour = TourEntry;

	const clearSlowSyncTimer = () => {
		if (slowSyncTimer) {
			clearTimeout(slowSyncTimer);
			slowSyncTimer = null;
		}
	};

	const clearSyncCompleteTimer = () => {
		if (syncCompleteTimer) {
			clearTimeout(syncCompleteTimer);
			syncCompleteTimer = null;
		}
	};

	const clearAllSyncTimers = () => {
		clearSlowSyncTimer();
		clearSyncCompleteTimer();
	};

	const resetSyncMessages = () => {
		showSlowSyncMessage = false;
		showSyncCompleteMessage = false;
	};

	const startSlowSyncTimer = () => {
		slowSyncTimer = setTimeout(() => {
			if (isSyncing) {
				showSlowSyncMessage = true;
			}
		}, SLOW_SYNC_DELAY_MS);
	};

	const showSyncCompleteAlertTemporarily = () => {
		showSyncCompleteMessage = true;
		clearSyncCompleteTimer();
		syncCompleteTimer = setTimeout(() => {
			showSyncCompleteMessage = false;
		}, SYNC_COMPLETE_ALERT_MS);
	};

	const finishSyncRun = () => {
		isSyncing = false;
		showSlowSyncMessage = false;
		clearSlowSyncTimer();
	};

	const enhanceSync: SubmitFunction = () => {
		isSyncing = true;
		resetSyncMessages();
		clearAllSyncTimers();
		startSlowSyncTimer();

		return async ({ result, update }) => {
			try {
				if (result.type === 'success' || result.type === 'failure') {
					await update();
				}

				if (result.type === 'success') {
					await invalidateAll();
					showSyncCompleteAlertTemporarily();
				}
			} finally {
				finishSyncRun();
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

	const weekdayLabels = $derived.by(() => [
		m.weekday_mo(),
		m.weekday_tu(),
		m.weekday_we(),
		m.weekday_th(),
		m.weekday_fr(),
		m.weekday_sa(),
		m.weekday_su()
	]);

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

		return m.touren_unnamed_tour();
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
		if (todayCell) {
			requestAnimationFrame(() => {
				todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
		}

		const onEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				closeTourDetails();
			}
		};

		window.addEventListener('keydown', onEscape);

		return () => {
			window.removeEventListener('keydown', onEscape);
			clearAllSyncTimers();
		};
	});
</script>

<svelte:head>
	<title>{m.touren_title()}</title>
	<meta name="description" content={m.touren_meta_description()} />
</svelte:head>

<div class="mx-auto w-full max-w-6xl grow px-4 py-10">
	<TourenPageTopbar {isSyncing} {enhanceSync} />

	{#if isSyncing}
		<div class="mb-6">
			<progress class="progress w-full progress-primary"></progress>
		</div>
	{/if}

	{#if isSyncing && showSlowSyncMessage}
		<div class="mb-6 alert alert-warning">
			<span>The SBB Api is slow, please wait</span>
		</div>
	{/if}

	{#if showSyncCompleteMessage}
		<div class="mb-6 alert alert-success">
			<span>Synchronisation complete</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-6 alert alert-error">
			<span>{form.error}</span>
		</div>
	{/if}

	{#if data.touren.length === 0}
		<div class="mb-6 rounded-box border border-base-300 bg-base-200 p-4 text-sm">
			{m.touren_no_tours_found()}
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
