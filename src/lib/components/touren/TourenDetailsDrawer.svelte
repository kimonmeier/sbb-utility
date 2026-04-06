<script lang="ts">
	import { SopreTourType } from '$lib/types/SopreTypes';
	import type { TourEntry } from './touren-types';

	let {
		selectedTour,
		selectedTourDay,
		closeTourDetails,
		formatDateLabel,
		formatTime,
		getTourLabel
	}: {
		selectedTour: TourEntry | null;
		selectedTourDay: Date | null;
		closeTourDetails: () => void;
		formatDateLabel: (value: number | Date) => string;
		formatTime: (value?: number | Date | null) => string;
		getTourLabel: (tour: TourEntry) => string;
	} = $props();

	const formatMinutes = (value?: number | null) => {
		if (value === undefined || value === null) {
			return '—';
		}

		const hours = Math.floor(value / 60);
		const minutes = value % 60;
		const hoursLabel = `${hours} h`;
		const minutesLabel = `${minutes.toString().padStart(2, '0')} min`;

		if (hours === 0) {
			return `${value} min`;
		}

		return `${hoursLabel} ${minutesLabel} (${value} min)`;
	};
</script>

{#if selectedTour}
	<button
		type="button"
		onclick={closeTourDetails}
		class="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px]"
		aria-label="Details schliessen"
	></button>

	<aside
		class="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-base-300 bg-base-100 shadow-2xl"
	>
		<div class="flex h-full flex-col">
			<div class="flex items-start justify-between border-b border-base-300 p-5">
				<div>
					<p class="text-xs tracking-[0.2em] uppercase opacity-60">Tour Detail</p>
					<h2 class="mt-1 text-2xl font-semibold">{getTourLabel(selectedTour)}</h2>
					<p class="mt-1 text-sm opacity-70">
						{selectedTourDay
							? formatDateLabel(selectedTourDay)
							: formatDateLabel(selectedTour.datum)}
					</p>
				</div>
				<button type="button" class="btn btn-ghost btn-sm" onclick={closeTourDetails}
					>Schliessen</button
				>
			</div>

			<div class="space-y-4 overflow-y-auto p-5">
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div class="rounded-xl border border-base-300 bg-base-200/70 p-3">
						<p class="text-xs uppercase opacity-60">Startzeit</p>
						<p class="mt-1 text-base font-semibold">{formatTime(selectedTour.startTime)}</p>
					</div>
					<div class="rounded-xl border border-base-300 bg-base-200/70 p-3">
						<p class="text-xs uppercase opacity-60">Endzeit</p>
						<p class="mt-1 text-base font-semibold">{formatTime(selectedTour.endTime)}</p>
					</div>
				</div>

				<div class="rounded-xl border border-base-300 p-4">
					<p class="text-xs tracking-[0.14em] uppercase opacity-60">Attribute</p>
					<div class="mt-3 flex flex-wrap gap-2">
						{#if selectedTour.abkuerzung != SopreTourType.UNBEKANNT}
							<div class="badge badge-neutral">{selectedTour.abkuerzung}</div>
						{/if}
						{#if selectedTour.tourNumber}
							<div class="badge badge-primary">#{selectedTour.tourNumber}</div>
						{/if}
						{#if selectedTour.tourSuffix}
							<div class="badge badge-outline">Suffix {selectedTour.tourSuffix}</div>
						{/if}
						{#if selectedTour.depot}
							<div class="badge badge-outline">Depot {selectedTour.depot}</div>
						{/if}
					</div>
				</div>

				<div class="rounded-xl border border-base-300 p-4">
					<p class="text-xs tracking-[0.14em] uppercase opacity-60">Zeitangaben in Minuten</p>
					<div class="mt-3 grid grid-cols-2 gap-3 text-sm">
						<div class="rounded-lg bg-base-200/70 p-3">
							<p class="text-xs uppercase opacity-60">Schichtdauer</p>
							<p class="mt-1 font-semibold">{formatMinutes(selectedTour.schichtdauer)}</p>
						</div>
						<div class="rounded-lg bg-base-200/70 p-3">
							<p class="text-xs uppercase opacity-60">Arbeitszeit</p>
							<p class="mt-1 font-semibold">{formatMinutes(selectedTour.arbeitszeit)}</p>
						</div>
						<div class="rounded-lg bg-base-200/70 p-3">
							<p class="text-xs uppercase opacity-60">Bezahlte Zeit</p>
							<p class="mt-1 font-semibold">{formatMinutes(selectedTour.bezahlteZeit)}</p>
						</div>
						<div class="rounded-lg bg-base-200/70 p-3">
							<p class="text-xs uppercase opacity-60">Bezahlte Pause</p>
							<p class="mt-1 font-semibold">{formatMinutes(selectedTour.bezahltePause)}</p>
						</div>
					</div>
				</div>

				{#if selectedTour.lastEdited}
					<div class="rounded-xl border border-base-300 p-4 text-sm">
						<p class="text-xs tracking-[0.14em] uppercase opacity-60">Letzte Bearbeitung</p>
						<p class="mt-1">{formatDateLabel(selectedTour.lastEdited)}</p>
					</div>
				{/if}

				{#if selectedTour.aenderungKommentar}
					<div class="rounded-xl border border-info/40 bg-info/10 p-4 text-sm">
						<p class="text-xs tracking-[0.14em] uppercase opacity-70">Kommentar</p>
						<p class="mt-1 leading-relaxed">{selectedTour.aenderungKommentar}</p>
					</div>
				{/if}
			</div>
		</div>
	</aside>
{/if}
