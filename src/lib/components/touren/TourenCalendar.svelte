<script lang="ts">
	import { SopreTourType } from '$lib/types/SopreTypes';
	import type { CalendarMonth, TourEntry } from './touren-types';

	let {
		calendarMonths,
		weekdayLabels,
		TODAY_CELL_ID,
		formatDayNumber,
		formatTime,
		getTourLabel,
		onSelectTour
	}: {
		calendarMonths: CalendarMonth[];
		weekdayLabels: string[];
		TODAY_CELL_ID: string;
		formatDayNumber: (value: Date) => string;
		formatTime: (value?: number | Date | null) => string;
		getTourLabel: (tour: TourEntry) => string;
		onSelectTour: (tour: TourEntry, day: Date) => void;
	} = $props();
</script>

<div class="mb-6 flex flex-wrap gap-2">
	{#each calendarMonths as month (month.id)}
		<a class="btn btn-outline btn-sm" href={`#${month.id}`}>{month.label}</a>
	{/each}
</div>

<div class="space-y-8">
	{#each calendarMonths as month (month.id)}
		<section
			id={month.id}
			class="rounded-box border border-base-300 bg-base-200 p-4 shadow-sm md:p-5"
		>
			<div class="mb-4 flex items-center justify-between gap-3">
				<h2 class="text-xl font-semibold capitalize">{month.label}</h2>
			</div>

			<div
				class="grid grid-cols-7 gap-2 text-center text-xs font-semibold tracking-[0.14em] uppercase opacity-60"
			>
				{#each weekdayLabels as weekday (weekday)}
					<div class="py-1">{weekday}</div>
				{/each}
			</div>

			<div class="mt-2 space-y-2">
				{#each month.weeks as week, weekIndex (`${month.id}-${weekIndex}`)}
					<div class="grid grid-cols-7 gap-2">
						{#each week as day (day.key)}
							<article
								id={day.isToday ? TODAY_CELL_ID : undefined}
								class={`min-h-28 rounded-xl border p-2 transition-colors ${day.inCurrentMonth ? 'border-base-300 bg-base-100' : 'border-base-300/60 bg-base-100/40 opacity-55'} ${day.isToday ? 'border-primary ring-2 ring-primary/40' : ''} ${day.tour ? 'cursor-pointer hover:border-primary/70 hover:bg-base-100' : ''}`}
							>
								<p class={`text-xs font-semibold ${day.isToday ? 'text-primary' : 'opacity-70'}`}>
									{formatDayNumber(day.date)}
								</p>

								{#if day.tour}
									<button
										type="button"
										onclick={() => onSelectTour(day.tour!, day.date)}
										class="mt-2 w-full space-y-2 text-left text-xs"
									>
										<p class="line-clamp-2 leading-snug font-semibold">{getTourLabel(day.tour)}</p>
										<p class="opacity-75">
											{formatTime(day.tour.startTime)} - {formatTime(day.tour.endTime)}
										</p>
										<div class="flex flex-wrap gap-1">
											{#if day.tour.abkuerzung != SopreTourType.UNBEKANNT}
												<div class="badge badge-xs badge-neutral">{day.tour.abkuerzung}</div>
											{/if}
											{#if day.tour.depot}
												<div class="badge badge-outline badge-xs">{day.tour.depot}</div>
											{/if}
											{#if day.tour.aenderungKommentar}
												<div class="badge badge-xs badge-info">Kommentar</div>
											{/if}
										</div>
									</button>
								{:else if day.inCurrentMonth}
									<p class="mt-2 text-xs opacity-35">Keine Tour</p>
								{/if}
							</article>
						{/each}
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>
