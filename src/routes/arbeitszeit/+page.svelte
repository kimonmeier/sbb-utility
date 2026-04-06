<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();

	const formatNumber = (value: number) =>
		new Intl.NumberFormat('de-CH', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);

	const formatDelta = (value: number) => {
		const prefix = value > 0 ? '+' : '';
		return `${prefix}${formatNumber(value)}`;
	};

	const formatCoverageText = (balance: number, singular: string, plural: string) => {
		if (balance > 0) {
			const amount = formatNumber(balance);
			return m.arbeitszeit_coverage_too_few({
				amount,
				unit: balance === 1 ? singular : plural
			});
		}

		if (balance < 0) {
			const amount = formatNumber(Math.abs(balance));
			return m.arbeitszeit_coverage_too_many({
				amount,
				unit: Math.abs(balance) === 1 ? singular : plural
			});
		}

		return m.arbeitszeit_coverage_balanced();
	};

	const calendarWeekdayLabels = $derived.by(() => [
		m.weekday_mo(),
		m.weekday_tu(),
		m.weekday_we(),
		m.weekday_th(),
		m.weekday_fr(),
		m.weekday_sa(),
		m.weekday_su()
	]);

	const accountFilterOptions = ['5', '9040', '9046', '9047'] as const;
	type AccountFilter = (typeof accountFilterOptions)[number];
	type FutureViewMode = 'table' | 'calendar';

	let futureViewMode = $state<FutureViewMode>('table');

	let accountFilters = $state<Record<AccountFilter, boolean>>({
		'5': true,
		'9040': true,
		'9046': true,
		'9047': true
	});

	const setAllAccountFilters = (nextValue: boolean) => {
		accountFilters = {
			'5': nextValue,
			'9040': nextValue,
			'9046': nextValue,
			'9047': nextValue
		};
	};

	const toggleAccountFilter = (accountId: AccountFilter) => {
		accountFilters = {
			...accountFilters,
			[accountId]: !accountFilters[accountId]
		};
	};

	const projectionEventCountsByAccount = $derived.by(() => {
		const counts: Record<AccountFilter, number> = {
			'5': 0,
			'9040': 0,
			'9046': 0,
			'9047': 0
		};

		for (const event of data.projectionEvents) {
			if (event.accountId in counts) {
				counts[event.accountId as AccountFilter] += 1;
			}
		}

		return counts;
	});

	const filteredProjectionEvents = $derived.by(() =>
		data.projectionEvents.filter((event) => {
			if (!(event.accountId in accountFilters)) {
				return true;
			}

			return accountFilters[event.accountId as AccountFilter];
		})
	);

	const filteredProjectionEventsByDate = $derived.by(() => {
		const grouped: Array<{ date: string; events: typeof data.projectionEvents }> = [];

		for (const event of filteredProjectionEvents) {
			const existing = grouped.find((entry) => entry.date === event.date);
			if (existing) {
				existing.events.push(event);
				continue;
			}

			grouped.push({
				date: event.date,
				events: [event]
			});
		}

		return grouped.sort((a, b) => a.date.localeCompare(b.date));
	});

	const formatMonthTitle = (year: number, monthZeroBased: number) =>
		new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
			new Date(Date.UTC(year, monthZeroBased, 1))
		);

	const calendarMonths = $derived.by(() => {
		type SaldoPreview = {
			accountId: AccountFilter;
			balance: number;
		};

		type CalendarCell = {
			dateKey: string;
			dayNumber: number;
			events: typeof data.projectionEvents;
			saldoPreview: SaldoPreview[];
		};

		type CalendarMonth = {
			monthKey: string;
			title: string;
			cells: Array<CalendarCell | null>;
		};

		const byDate = filteredProjectionEventsByDate;
		if (byDate.length === 0) {
			return [] as CalendarMonth[];
		}

		const monthKeys: string[] = [];
		for (const entry of byDate) {
			const key = entry.date.slice(0, 7);
			if (!monthKeys.includes(key)) {
				monthKeys.push(key);
			}
		}

		const months: CalendarMonth[] = [];
		for (const monthKey of monthKeys) {
			const [yearString, monthString] = monthKey.split('-');
			const year = Number.parseInt(yearString, 10);
			const month = Number.parseInt(monthString, 10);
			const monthZeroBased = month - 1;
			const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

			const monthStart = new Date(Date.UTC(year, monthZeroBased, 1));
			const startWeekday = monthStart.getUTCDay();
			const leadingEmptyCells = startWeekday === 0 ? 6 : startWeekday - 1;

			const cells: Array<CalendarCell | null> = [];
			for (let i = 0; i < leadingEmptyCells; i += 1) {
				cells.push(null);
			}

			for (let day = 1; day <= daysInMonth; day += 1) {
				const dateKey = `${yearString}-${monthString}-${String(day).padStart(2, '0')}`;
				const events = byDate.find((entry) => entry.date === dateKey)?.events ?? [];

				const previewByAccount: Partial<Record<AccountFilter, number>> = {};
				for (const event of events) {
					if (event.accountId in accountFilters) {
						previewByAccount[event.accountId as AccountFilter] = event.resultBalance;
					}
				}

				const saldoPreview = accountFilterOptions
					.filter((accountId) => previewByAccount[accountId] != null)
					.map((accountId) => ({
						accountId,
						balance: previewByAccount[accountId] as number
					}));

				cells.push({ dateKey, dayNumber: day, events, saldoPreview });
			}

			months.push({
				monthKey,
				title: formatMonthTitle(year, monthZeroBased),
				cells
			});
		}

		return months;
	});

	const historyByAccount = $derived.by(() => {
		const grouped: Array<{ accountId: string; description: string; rows: PageData['history'] }> =
			[];

		for (const row of data.history) {
			const existing = grouped.find((entry) => entry.accountId === row.accountId);
			if (existing) {
				existing.rows.push(row);
				continue;
			}

			grouped.push({
				accountId: row.accountId,
				description: row.description,
				rows: [row]
			});
		}

		return grouped.sort((a, b) => a.accountId.localeCompare(b.accountId));
	});
</script>

<svelte:head>
	<title>{m.arbeitszeit_title()}</title>
	<meta name="description" content={m.arbeitszeit_meta_description()} />
</svelte:head>

<div class="mx-auto w-full max-w-6xl grow space-y-8 px-4 py-10">
	<section class="rounded-box border border-base-300 bg-base-100 p-5">
		<h1 class="text-2xl font-bold">{m.arbeitszeit_heading()}</h1>
		<p class="mt-2 text-sm text-base-content/70">
			{m.arbeitszeit_intro()}
		</p>
		{#if data.latestSnapshotDate}
			<p class="mt-2 text-xs text-base-content/60">
				{m.arbeitszeit_last_snapshot({ date: data.latestSnapshotDate })}
			</p>
		{/if}
	</section>

	<section class="rounded-box border border-base-300 bg-base-100 p-5">
		<h2 class="text-lg font-semibold">{m.arbeitszeit_balance_forecast()}</h2>
		<div class="mt-4 overflow-x-auto">
			<table class="table table-zebra">
				<thead>
					<tr>
						<th>{m.arbeitszeit_account()}</th>
						<th>{m.arbeitszeit_description()}</th>
						<th>{m.arbeitszeit_current()}</th>
						<th>{m.arbeitszeit_forecast()}</th>
						<th>{m.arbeitszeit_difference()}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.projectedBalances as balance (balance.accountId)}
						<tr>
							<td class="font-mono">{balance.accountId}</td>
							<td>{balance.description}</td>
							<td>{formatNumber(balance.base)}</td>
							<td>{formatNumber(balance.projected)}</td>
							<td class={balance.projected - balance.base < 0 ? 'text-error' : 'text-success'}>
								{formatDelta(balance.projected - balance.base)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="rounded-box border border-base-300 bg-base-100 p-5">
		<h2 class="text-lg font-semibold">
			{m.arbeitszeit_restday_calculator({ year: data.restDayCalculator.year })}
		</h2>
		<p class="mt-2 text-sm text-base-content/70">
			{m.arbeitszeit_restday_intro({
				from: data.restDayCalculator.fullYearRange.from,
				to: data.restDayCalculator.fullYearRange.to,
				ctTarget: data.restDayCalculator.expectedCtCount
			})}
		</p>

		<div class="mt-4 grid gap-3 md:grid-cols-3">
			<div class="rounded-box border border-base-300 bg-base-200/60 p-3">
				<p class="text-xs uppercase opacity-60">{m.arbeitszeit_restdays()}</p>
				<p class="mt-1 text-base font-semibold">
					{m.arbeitszeit_target_planned_estimated_holiday({
						target: data.restDayCalculator.expectedRtCount,
						planned: data.restDayCalculator.knownRtCount,
						holiday: data.restDayCalculator.ferienRtCount,
						estimated: data.restDayCalculator.estimatedRtCount
					})}
				</p>
				<p
					class={`mt-1 text-sm ${data.restDayCalculator.projectedRtBalanceWithEstimate > 0 ? 'text-warning' : data.restDayCalculator.projectedRtBalanceWithEstimate < 0 ? 'text-error' : 'text-success'}`}
				>
					{formatCoverageText(
						data.restDayCalculator.projectedRtBalanceWithEstimate,
						m.arbeitszeit_unit_restday(),
						m.arbeitszeit_unit_restdays()
					)}
				</p>
			</div>

			<div class="rounded-box border border-base-300 bg-base-200/60 p-3">
				<p class="text-xs uppercase opacity-60">{m.arbeitszeit_compdays()}</p>
				<p class="mt-1 text-base font-semibold">
					{m.arbeitszeit_target_planned_estimated_holiday({
						target: data.restDayCalculator.expectedCtCount,
						planned: data.restDayCalculator.knownCtCount,
						holiday: data.restDayCalculator.ferienCtCount,
						estimated: data.restDayCalculator.estimatedCtCount
					})}
				</p>
				<p
					class={`mt-1 text-sm ${data.restDayCalculator.projectedCtBalanceWithEstimate > 0 ? 'text-warning' : data.restDayCalculator.projectedCtBalanceWithEstimate < 0 ? 'text-error' : 'text-success'}`}
				>
					{formatCoverageText(
						data.restDayCalculator.projectedCtBalanceWithEstimate,
						m.arbeitszeit_unit_compday(),
						m.arbeitszeit_unit_compdays()
					)}
				</p>
			</div>

			<div class="rounded-box border border-base-300 bg-base-200/60 p-3">
				<p class="text-xs uppercase opacity-60">{m.arbeitszeit_combined()}</p>
				<p class="mt-1 text-base font-semibold">
					{m.arbeitszeit_total({
						total: data.restDayCalculator.totalRtCount + data.restDayCalculator.totalCtCount
					})}
				</p>
				<p
					class={`mt-1 text-sm ${data.restDayCalculator.projectedCombinedBalanceWithEstimate > 0 ? 'text-warning' : data.restDayCalculator.projectedCombinedBalanceWithEstimate < 0 ? 'text-error' : 'text-success'}`}
				>
					{formatCoverageText(
						data.restDayCalculator.projectedCombinedBalanceWithEstimate,
						m.arbeitszeit_unit_day(),
						m.arbeitszeit_unit_days()
					)}
				</p>
			</div>
		</div>

		<div class="mt-4 rounded-box border border-base-300 bg-base-200/40 p-3 text-sm">
			<p>
				{m.arbeitszeit_holiday_note({
					rt: data.restDayCalculator.ferienRtCount,
					ct: data.restDayCalculator.ferienCtCount
				})}
			</p>
			<p class="mt-2">
				{m.arbeitszeit_saturday_note({
					saturdays: data.restDayCalculator.saturdaysInYear,
					ctTarget: data.restDayCalculator.expectedCtCount
				})}
			</p>

			{#if data.restDayCalculator.estimateRange}
				<p class="mt-2">
					{m.arbeitszeit_estimate_range({
						from: data.restDayCalculator.estimateRange.from,
						to: data.restDayCalculator.estimateRange.to
					})}
				</p>
			{:else}
				<p class="mt-2">{m.arbeitszeit_no_estimates()}</p>
			{/if}
		</div>

		{#if data.restDayCalculator.estimatedRestDays.length > 0}
			<div class="mt-4 overflow-x-auto">
				<table class="table table-zebra table-sm">
					<thead>
						<tr>
							<th>{m.arbeitszeit_estimated_on()}</th>
							<th>{m.arbeitszeit_type()}</th>
							<th>{m.arbeitszeit_hint()}</th>
						</tr>
					</thead>
					<tbody>
						{#each data.restDayCalculator.estimatedRestDays as row (`${row.date}-${row.type}`)}
							<tr>
								<td>{row.date}</td>
								<td>
									<span
										class={`badge badge-sm ${row.type === 'RT' ? 'badge-primary' : 'badge-secondary'}`}
										>{row.type}</span
									>
								</td>
								<td>{row.reason}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="rounded-box border border-base-300 bg-base-100 p-5">
		<h2 class="text-lg font-semibold">{m.arbeitszeit_future_events()}</h2>
		{#if data.projectionEvents.length === 0}
			<p class="mt-3 text-sm text-base-content/70">
				{m.arbeitszeit_no_future_tours()}
			</p>
		{:else}
			<div class="mt-4 flex flex-wrap items-center gap-2">
				{#each accountFilterOptions as accountId (accountId)}
					<button
						type="button"
						class={`badge cursor-pointer border badge-lg transition ${accountFilters[accountId] ? 'border-primary badge-primary' : 'badge-outline border-base-300'}`}
						onclick={() => toggleAccountFilter(accountId)}
					>
						Konto {accountId} ({projectionEventCountsByAccount[accountId]})
					</button>
				{/each}
				<button type="button" class="btn btn-xs" onclick={() => setAllAccountFilters(true)}>
					{m.arbeitszeit_all()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs"
					onclick={() => setAllAccountFilters(false)}
				>
					{m.arbeitszeit_none()}
				</button>
			</div>

			<div class="join mt-3">
				<button
					type="button"
					class={`btn join-item btn-md ${futureViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
					onclick={() => (futureViewMode = 'table')}
				>
					{m.arbeitszeit_table()}
				</button>
				<button
					type="button"
					class={`btn join-item btn-md ${futureViewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
					onclick={() => (futureViewMode = 'calendar')}
				>
					{m.arbeitszeit_calendar()}
				</button>
			</div>

			{#if filteredProjectionEvents.length === 0}
				<p class="mt-3 text-sm text-base-content/70">
					{m.arbeitszeit_no_events_selected_accounts()}
				</p>
			{:else if futureViewMode === 'table'}
				<div class="mt-4 overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>{m.arbeitszeit_date()}</th>
								<th>{m.arbeitszeit_tour()}</th>
								<th>{m.arbeitszeit_account()}</th>
								<th>{m.arbeitszeit_rule()}</th>
								<th>{m.arbeitszeit_delta()}</th>
								<th>{m.arbeitszeit_new_balance()}</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredProjectionEvents as event (`${event.date}-${event.tourLabel}-${event.accountId}-${event.resultBalance}`)}
								<tr>
									<td>{event.date}</td>
									<td>{event.tourLabel}</td>
									<td class="font-mono">{event.accountId}</td>
									<td>{event.rule}</td>
									<td class={event.delta < 0 ? 'text-error' : 'text-success'}>
										{formatDelta(event.delta)}
									</td>
									<td>{formatNumber(event.resultBalance)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="mt-5 space-y-6">
					{#each calendarMonths as month (month.monthKey)}
						<div class="rounded-box border border-base-300 bg-base-200/60 p-5">
							<div class="mb-3 flex items-center justify-between">
								<h3 class="text-xl font-semibold capitalize">{month.title}</h3>
							</div>
							<div
								class="mb-3 grid grid-cols-7 gap-3 text-center text-sm font-semibold text-base-content/70"
							>
								{#each calendarWeekdayLabels as label (label)}
									<div>{label}</div>
								{/each}
							</div>
							<div class="grid grid-cols-7 gap-3">
								{#each month.cells as cell, index (`${month.monthKey}-${index}`)}
									{#if !cell}
										<div
											class="min-h-36 rounded-box border border-dashed border-base-300 bg-base-100/20"
										></div>
									{:else}
										<div
											class={`min-h-36 rounded-box border p-3 ${cell.events.length > 0 ? 'border-primary/40 bg-primary/5' : 'border-base-300 bg-base-100'}`}
										>
											<div class="mb-2 text-sm font-semibold">{cell.dayNumber}</div>
											{#if cell.events.length > 0}
												<div class="mb-2 flex flex-wrap gap-1.5">
													{#each cell.saldoPreview as preview (`${cell.dateKey}-${preview.accountId}`)}
														<span class="badge badge-outline font-mono badge-sm">
															S {preview.accountId}: {formatNumber(preview.balance)}
														</span>
													{/each}
												</div>
												<div class="space-y-1.5">
													{#each cell.events as event (`${event.date}-${event.tourLabel}-${event.accountId}-${event.resultBalance}`)}
														<div class="rounded bg-base-200 px-2 py-1.5 text-xs">
															<div class="font-mono text-[13px]">
																{event.accountId} · {formatDelta(event.delta)}
															</div>
															<div class="truncate text-[13px] text-base-content/80">
																{event.tourLabel}
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if data.ignoredFutureTours.length > 0}
			<div class="mt-5 rounded-box border border-warning/30 bg-warning/10 p-4">
				<h3 class="font-semibold">{m.arbeitszeit_ignored_days()}</h3>
				<p class="mt-1 text-sm text-base-content/70">
					{data.ignoredFutureTours.length} Tag(e) wurden ignoriert (z. B. fehlende bezahlteZeit oder Ferien-Ausgleichs-/Ruhetage).
				</p>
				<ul class="mt-2 list-disc pl-5 text-sm">
					{#each data.ignoredFutureTours as ignored (`${ignored.date}-${ignored.tourLabel}`)}
						<li>{ignored.date} - {ignored.tourLabel} ({ignored.reason})</li>
					{/each}
				</ul>
			</div>
		{/if}
	</section>

	<section class="rounded-box border border-base-300 bg-base-100 p-5">
		<h2 class="text-lg font-semibold">{m.arbeitszeit_history_accounts()}</h2>
		{#if historyByAccount.length === 0}
			<p class="mt-3 text-sm text-base-content/70">{m.arbeitszeit_no_snapshot_history()}</p>
		{:else}
			<div class="mt-4 grid gap-4 md:grid-cols-2">
				{#each historyByAccount as account (account.accountId)}
					<div class="rounded-box border border-base-300 bg-base-200 p-4">
						<h3 class="font-semibold">{m.arbeitszeit_account()} {account.accountId}</h3>
						<p class="text-sm text-base-content/70">{account.description}</p>
						<div class="mt-3 max-h-72 overflow-auto">
							<table class="table table-xs">
								<thead>
									<tr>
										<th>{m.arbeitszeit_date()}</th>
										<th>{m.arbeitszeit_value()}</th>
									</tr>
								</thead>
								<tbody>
									{#each account.rows as row (`${row.accountId}-${row.snapshotDate}-${row.value}`)}
										<tr>
											<td>{row.snapshotDate}</td>
											<td>{formatNumber(row.value)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>
