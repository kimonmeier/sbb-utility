<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { buildCalendarMonths } from '$lib/components/touren/touren-calendar.utils';
	import type { CalendarMonth, TourEntry } from '$lib/components/touren/touren-types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();

	type DayStatus = 'valid' | 'warning' | 'invalid';
	type Issue = {
		code: string;
		message: string;
		severity: 'error' | 'warning';
		canAcknowledge: boolean;
		decisionGroup?: string;
		issueId: string;
	};
	type DayValidation = {
		dateKey: string;
		tourId: string;
		issues: Issue[];
	};
	type DayDetails = {
		dateKey: string;
		issues: Issue[];
	};
	type MitentscheidOverviewEntry = {
		decisionKey: string;
		code: string;
		message: string;
		decision?: MitentscheidDecision;
		dateKeys: string[];
		issueCount: number;
	};
	type GroupedMitentscheidEntry = {
		decisionKey: string;
		code: string;
		message: string;
		dateKeys: string[];
		issueCount: number;
	};

	const MITENTSCHEID_STORAGE_KEY = 'validator.mitentscheidSelections.v3';
	const weekdayLabels = $derived.by(() => [
		m.weekday_mo(),
		m.weekday_tu(),
		m.weekday_we(),
		m.weekday_th(),
		m.weekday_fr(),
		m.weekday_sa(),
		m.weekday_su()
	]);
	const validatorRuleLegend: Array<{
		title: string;
		description: string;
		codes: string[];
	}> = [
		{
			title: m.validator_rule_night_title(),
			description: m.validator_rule_night_desc(),
			codes: [
				'NIGHT_BOUNDARY_28_DAY_LIMIT_EXCEEDED',
				'NIGHT_BOUNDARY_CONSECUTIVE_DAYS_MITENTSCHEID',
				'NIGHT_BOUNDARY_CONSECUTIVE_DAYS_EXCEEDED'
			]
		},
		{
			title: m.validator_rule_special_title(),
			description: m.validator_rule_special_desc(),
			codes: [
				'SPECIAL_WORK_RANGE_CONSECUTIVE_DAYS',
				'SPECIAL_WORK_RANGE_SHIFT_TOO_LONG',
				'SPECIAL_WORK_RANGE_NIGHT_WINDOW_FORBIDDEN'
			]
		},
		{
			title: m.validator_rule_data_title(),
			description: m.validator_rule_data_desc(),
			codes: ['NON_WORKING_WITH_TIMES', 'MISSING_BOUNDARY_TIMES', 'END_BEFORE_START']
		},
		{
			title: m.validator_rule_rest_title(),
			description: m.validator_rule_rest_desc(),
			codes: [
				'INSUFFICIENT_REST',
				'RT_SINGLE_TOTAL_DURATION_TOO_SHORT',
				'RT_SINGLE_TOTAL_DURATION_MITENTSCHEID'
			]
		},
		{
			title: m.validator_rule_duration_title(),
			description: m.validator_rule_duration_desc(),
			codes: [
				'WORKING_TIME_BELOW_MINIMUM_SHIFT',
				'SHIFT_TOO_LONG',
				'WORKING_TIME_TOO_LONG',
				'WORKING_EXCEEDS_SHIFT',
				'PAID_BREAK_EXCEEDS_SHIFT'
			]
		},
		{
			title: m.validator_rule_avg_title(),
			description: m.validator_rule_avg_desc(),
			codes: ['AVG_WORKING_TIME_7_WORKDAYS_EXCEEDED']
		}
	];

	type MitentscheidDecision = 'accepted' | 'rejected';
	let mitentscheidState = $state<Record<string, MitentscheidDecision>>({});
	let selectedDateKey = $state<string | null>(null);

	const groupDetailsByDate = (rows: DayValidation[]): Record<string, DayDetails> => {
		const grouped: Record<string, DayDetails> = {};

		for (const row of rows) {
			const existing = grouped[row.dateKey];
			if (existing) {
				existing.issues.push(...row.issues);
				continue;
			}

			grouped[row.dateKey] = {
				dateKey: row.dateKey,
				issues: [...row.issues]
			};
		}

		return grouped;
	};

	const calendarMonths = $derived.by<CalendarMonth[]>(() =>
		buildCalendarMonths(data.touren as TourEntry[])
	);

	const validations = $derived.by<DayValidation[]>(() =>
		data.validations.map((entry) => ({
			dateKey: entry.dateKey,
			tourId: entry.tourId,
			issues: entry.issues.map((issue, index) => ({
				code: issue.code,
				message: issue.message,
				severity: issue.severity ?? 'error',
				canAcknowledge: issue.canAcknowledge ?? false,
				decisionGroup: issue.decisionGroup,
				issueId: `${entry.dateKey}::${entry.tourId}::${issue.code}::${index}`
			}))
		}))
	);

	const detailsByDate = $derived.by(() => groupDetailsByDate(validations));

	const getIssueDecisionKey = (issue: Issue): string => {
		if (issue.decisionGroup) {
			return `group::${issue.decisionGroup}`;
		}

		return issue.issueId;
	};

	const getMitentscheidDecision = (issue: Issue): MitentscheidDecision | undefined =>
		mitentscheidState[getIssueDecisionKey(issue)];

	type IssueOverviewState = 'hidden' | 'warning' | 'error';

	const getOverviewIssueState = (issue: Issue): IssueOverviewState => {
		if (!issue.canAcknowledge) {
			return issue.severity === 'error' ? 'error' : 'warning';
		}

		const decision = getMitentscheidDecision(issue);
		if (decision === 'accepted') {
			return 'hidden';
		}

		if (decision === 'rejected') {
			return 'error';
		}

		return 'warning';
	};

	const getEffectiveIssueSeverity = (issue: Issue): 'error' | 'warning' => {
		const state = getOverviewIssueState(issue);
		if (state === 'error') {
			return 'error';
		}

		return 'warning';
	};

	const getVisibleOverviewIssues = (details?: DayDetails): Issue[] => {
		if (!details) {
			return [];
		}

		return details.issues.filter((issue) => getOverviewIssueState(issue) !== 'hidden');
	};

	const getEffectiveDayStatus = (details?: DayDetails): DayStatus => {
		if (!details || details.issues.length === 0) {
			return 'valid';
		}

		const visibleIssues = getVisibleOverviewIssues(details);
		if (visibleIssues.length === 0) {
			return 'valid';
		}

		const hasError = visibleIssues.some((issue) => getEffectiveIssueSeverity(issue) === 'error');
		if (hasError) {
			return 'invalid';
		}

		const hasOpenWarning = visibleIssues.some(
			(issue) => getEffectiveIssueSeverity(issue) === 'warning'
		);
		return hasOpenWarning ? 'warning' : 'valid';
	};

	const daySummaries = $derived.by(() =>
		Object.values(detailsByDate).map((entry) => ({
			dateKey: entry.dateKey,
			status: getEffectiveDayStatus(entry)
		}))
	);

	const selectedDetails = $derived.by(() =>
		selectedDateKey ? detailsByDate[selectedDateKey] : undefined
	);

	const selectedDateStatus = $derived.by(() => getEffectiveDayStatus(selectedDetails));

	const totalInvalidDays = $derived.by(
		() => daySummaries.filter((entry) => entry.status === 'invalid').length
	);

	const totalWarningDays = $derived.by(
		() => daySummaries.filter((entry) => entry.status === 'warning').length
	);

	const openIssueCount = $derived.by(
		() =>
			validations
				.flatMap((entry) => entry.issues)
				.filter((issue) => getOverviewIssueState(issue) === 'error').length
	);

	const buildMitentscheidOverviewEntries = (
		rows: DayValidation[],
		decisions: Record<string, MitentscheidDecision>
	): MitentscheidOverviewEntry[] => {
		const grouped: Record<string, GroupedMitentscheidEntry> = {};

		for (const validation of rows) {
			for (const issue of validation.issues) {
				if (!issue.canAcknowledge) {
					continue;
				}

				const decisionKey = getIssueDecisionKey(issue);
				const existing = grouped[decisionKey];
				if (existing) {
					existing.issueCount += 1;
					if (!existing.dateKeys.includes(validation.dateKey)) {
						existing.dateKeys.push(validation.dateKey);
					}
					continue;
				}

				grouped[decisionKey] = {
					decisionKey,
					code: issue.code,
					message: issue.message,
					dateKeys: [validation.dateKey],
					issueCount: 1
				};
			}
		}

		return Object.values(grouped)
			.map((entry) => ({
				decisionKey: entry.decisionKey,
				code: entry.code,
				message: entry.message,
				decision: decisions[entry.decisionKey],
				dateKeys: [...entry.dateKeys].sort(),
				issueCount: entry.issueCount
			}))
			.sort((a, b) => a.dateKeys[0].localeCompare(b.dateKeys[0]));
	};

	const mitentscheidOverviewEntries = $derived.by<MitentscheidOverviewEntry[]>(() => {
		return buildMitentscheidOverviewEntries(validations, mitentscheidState);
	});

	const decidedMitentscheidEntries = $derived.by(() =>
		mitentscheidOverviewEntries.filter((entry) => Boolean(entry.decision))
	);

	const acceptedMitentscheidCount = $derived.by(
		() => decidedMitentscheidEntries.filter((entry) => entry.decision === 'accepted').length
	);

	const rejectedMitentscheidCount = $derived.by(
		() => decidedMitentscheidEntries.filter((entry) => entry.decision === 'rejected').length
	);

	const undecidedMitentscheidCount = $derived.by(
		() => mitentscheidOverviewEntries.length - decidedMitentscheidEntries.length
	);

	const formatDayNumber = (value: Date) =>
		new Intl.DateTimeFormat('de-CH', { day: '2-digit' }).format(value);

	const formatDateLong = (dateKey: string) =>
		new Intl.DateTimeFormat('de-CH', {
			weekday: 'long',
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		}).format(new Date(`${dateKey}T00:00:00`));

	const formatDateShort = (dateKey: string) =>
		new Intl.DateTimeFormat('de-CH', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(new Date(`${dateKey}T00:00:00`));

	const persistMitentscheidState = () => {
		if (typeof localStorage === 'undefined') {
			return;
		}

		localStorage.setItem(MITENTSCHEID_STORAGE_KEY, JSON.stringify(mitentscheidState));
	};

	const setMitentscheidDecision = (issue: Issue, decision?: MitentscheidDecision) => {
		if (!issue.canAcknowledge) {
			return;
		}

		const next = { ...mitentscheidState };
		const key = getIssueDecisionKey(issue);
		if (!decision) {
			delete next[key];
		} else {
			next[key] = decision;
		}
		mitentscheidState = next;
		persistMitentscheidState();
	};

	const selectDay = (dateKey: string) => {
		selectedDateKey = dateKey;
	};

	onMount(() => {
		const raw = localStorage.getItem(MITENTSCHEID_STORAGE_KEY);
		if (raw) {
			try {
				const parsed = JSON.parse(raw) as Record<string, MitentscheidDecision>;
				if (parsed && typeof parsed === 'object') {
					mitentscheidState = parsed;
				}
			} catch {
				mitentscheidState = {};
			}
		}

		const firstWithIssues = Object.values(detailsByDate).find((entry) => entry.issues.length > 0);
		if (firstWithIssues) {
			selectedDateKey = firstWithIssues.dateKey;
		}
	});
</script>

<svelte:head>
	<title>{m.validator_title()}</title>
	<meta name="description" content={m.validator_meta_description()} />
</svelte:head>

<div class="mx-auto w-full max-w-7xl grow space-y-6 px-4 py-10">
	<section class="rounded-box border border-base-300 bg-base-100 p-5">
		<h1 class="text-2xl font-bold">{m.validator_heading()}</h1>
		<p class="mt-2 text-sm text-base-content/70">
			{m.validator_intro_select_day()}
		</p>
		<div class="mt-4 flex flex-wrap items-center gap-3 text-sm">
			<div class="badge gap-2 badge-outline badge-success">{m.status_valid()}</div>
			<div class="badge gap-2 badge-outline badge-warning">{m.status_warning()}</div>
			<div class="badge gap-2 badge-outline badge-error">{m.status_error()}</div>
			<div class="badge gap-2 badge-outline badge-neutral">
				{m.validator_open_errors({ count: openIssueCount })}
			</div>
			<div class="badge gap-2 badge-outline badge-error">
				{m.validator_invalid_days({ count: totalInvalidDays })}
			</div>
			<div class="badge gap-2 badge-outline badge-warning">
				{m.validator_warning_days({ count: totalWarningDays })}
			</div>
		</div>
		<div class="mt-4 rounded-xl border border-base-300 bg-base-200/60 p-3">
			<p class="text-sm font-semibold">{m.mitentscheid_overview_title()}</p>
			<div class="mt-2 flex flex-wrap gap-2 text-xs">
				<div class="badge badge-outline">
					{m.mitentscheid_total({ count: mitentscheidOverviewEntries.length })}
				</div>
				<div class="badge badge-outline badge-warning">
					{m.mitentscheid_accepted({ count: acceptedMitentscheidCount })}
				</div>
				<div class="badge badge-outline badge-error">
					{m.mitentscheid_rejected({ count: rejectedMitentscheidCount })}
				</div>
				<div class="badge badge-outline badge-neutral">
					{m.mitentscheid_open({ count: undecidedMitentscheidCount })}
				</div>
			</div>

			{#if decidedMitentscheidEntries.length === 0}
				<p class="mt-3 text-xs text-base-content/70">{m.mitentscheid_none()}</p>
			{:else}
				<div class="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
					{#each decidedMitentscheidEntries as entry (entry.decisionKey)}
						<div class="rounded-lg border border-base-300 bg-base-100 p-2">
							<div class="flex items-center justify-between gap-2">
								<span
									class={`badge badge-xs ${entry.decision === 'accepted' ? 'badge-warning' : 'badge-error'}`}
								>
									{entry.decision === 'accepted'
										? m.mitentscheid_applied()
										: m.mitentscheid_denied()}
								</span>
								<span class="text-[11px] opacity-60">{entry.code}</span>
							</div>
							<p class="mt-1 line-clamp-2 text-xs" title={entry.message}>{entry.message}</p>
							<p class="mt-1 text-[11px] opacity-70">
								{entry.dateKeys.length === 1
									? m.mitentscheid_day({ date: formatDateShort(entry.dateKeys[0]) })
									: m.mitentscheid_days({
											dates: entry.dateKeys.map((dateKey) => formatDateShort(dateKey)).join(', ')
										})}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<details class="mt-4 rounded-xl border border-base-300 bg-base-200/50 p-3">
			<summary class="cursor-pointer text-sm font-semibold">{m.validator_legend_summary()}</summary>
			<p class="mt-2 text-xs text-base-content/70">
				{m.validator_legend_intro()}
			</p>
			<div class="mt-3 space-y-3">
				{#each validatorRuleLegend as group (group.title)}
					<div class="rounded-lg border border-base-300 bg-base-100 p-3">
						<p class="text-sm font-semibold">{group.title}</p>
						<p class="mt-1 text-xs text-base-content/70">{group.description}</p>
						<div class="mt-2 flex flex-wrap gap-2">
							{#each group.codes as code (code)}
								<span class="badge badge-outline font-mono badge-sm">{code}</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</details>
	</section>

	<div class="flex flex-wrap gap-2">
		{#each calendarMonths as month (month.id)}
			<a class="btn btn-outline btn-sm" href={`#${month.id}`}>{month.label}</a>
		{/each}
	</div>

	<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
		<div class="space-y-8">
			{#each calendarMonths as month (month.id)}
				<section
					id={month.id}
					class="rounded-box border border-base-300 bg-base-200 p-4 shadow-sm md:p-5"
				>
					<h2 class="mb-4 text-xl font-semibold capitalize">{month.label}</h2>

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
									{@const details = detailsByDate[day.key]}
									{@const visibleIssues = getVisibleOverviewIssues(details)}
									{@const status = getEffectiveDayStatus(details)}
									<button
										type="button"
										onclick={() => selectDay(day.key)}
										class={`min-h-28 rounded-xl border p-2 text-left transition ${day.inCurrentMonth ? 'border-base-300 bg-base-100' : 'border-base-300/60 bg-base-100/40 opacity-55'} ${status === 'valid' ? 'border-success/50 bg-success/10' : ''} ${status === 'warning' ? 'border-warning/60 bg-warning/10' : ''} ${status === 'invalid' ? 'border-error/60 bg-error/10' : ''} ${selectedDateKey === day.key ? 'ring-2 ring-primary/50' : ''}`}
									>
										<p class="text-xs font-semibold opacity-70">{formatDayNumber(day.date)}</p>

										{#if visibleIssues.length}
											{@const firstIssue = visibleIssues[0]}
											<p
												title={firstIssue.message}
												class={`mt-2 text-xs font-semibold ${status === 'invalid' ? 'text-error' : status === 'warning' ? 'text-warning' : 'text-success'}`}
											>
												{status === 'invalid'
													? m.status_error()
													: status === 'warning'
														? m.status_warning()
														: m.status_valid()}
											</p>
											<p title={firstIssue.message} class="mt-1 line-clamp-3 text-xs opacity-90">
												{firstIssue.message}
											</p>
											{#if visibleIssues.length > 1}
												<p class="mt-1 text-[11px] opacity-70">
													+ {visibleIssues.length - 1} weitere
												</p>
											{/if}
										{:else if day.inCurrentMonth}
											<p class="mt-2 text-xs opacity-35">{m.validator_no_tour()}</p>
										{/if}
									</button>
								{/each}
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>

		<aside class="rounded-box border border-base-300 bg-base-100 p-4 lg:sticky lg:top-24">
			<h2 class="text-lg font-semibold">{m.validator_daydetails_title()}</h2>

			{#if !selectedDateKey}
				<p class="mt-3 text-sm text-base-content/70">{m.validator_select_day_prompt()}</p>
			{:else}
				<p class="mt-2 text-sm font-semibold">{formatDateLong(selectedDateKey)}</p>
				<p
					class={`mt-1 text-xs font-semibold ${selectedDateStatus === 'invalid' ? 'text-error' : selectedDateStatus === 'warning' ? 'text-warning' : 'text-success'}`}
				>
					{selectedDateStatus === 'invalid'
						? m.validator_status_invalid()
						: selectedDateStatus === 'warning'
							? m.validator_status_warning()
							: m.validator_status_valid()}
				</p>

				{#if !selectedDetails || selectedDetails.issues.length === 0}
					<p class="mt-3 text-sm text-base-content/70">{m.validator_no_issues()}</p>
				{:else}
					<div class="mt-4 space-y-3">
						{#each selectedDetails.issues as issue (issue.issueId)}
							{@const issueState = getOverviewIssueState(issue)}
							{@const effectiveSeverity = issueState === 'error' ? 'error' : 'warning'}
							{@const mitentscheidDecision = getMitentscheidDecision(issue)}
							<div
								class={`rounded-xl border p-3 ${issueState === 'hidden' ? 'border-success/40 bg-success/10' : effectiveSeverity === 'error' ? 'border-error/50 bg-error/5' : 'border-warning/50 bg-warning/5'}`}
							>
								<div class="flex items-center justify-between gap-2">
									<span
										class={`badge badge-sm ${effectiveSeverity === 'error' ? 'badge-error' : 'badge-warning'}`}
									>
										{issueState === 'hidden'
											? m.validator_badge_mitentscheid()
											: effectiveSeverity === 'error'
												? m.validator_badge_error()
												: m.validator_badge_warning()}
									</span>
									<span class="text-[11px] opacity-60">{issue.code}</span>
								</div>
								<p class="mt-2 text-sm" title={issue.message}>{issue.message}</p>
								{#if issueState === 'hidden'}
									<p class="mt-2 text-xs text-success">{m.validator_issue_hidden()}</p>
								{/if}

								{#if issue.canAcknowledge}
									<div class="mt-3 flex flex-wrap gap-2">
										<button
											type="button"
											onclick={() => setMitentscheidDecision(issue, 'accepted')}
											class={`btn btn-xs ${mitentscheidDecision === 'accepted' ? 'btn-warning' : 'btn-outline'}`}
										>
											{m.validator_apply_mitentscheid()}
										</button>
										<button
											type="button"
											onclick={() => setMitentscheidDecision(issue, 'rejected')}
											class={`btn btn-xs ${mitentscheidDecision === 'rejected' ? 'btn-error' : 'btn-outline'}`}
										>
											{m.validator_reject_mitentscheid()}
										</button>
										{#if mitentscheidDecision}
											<button
												type="button"
												onclick={() => setMitentscheidDecision(issue)}
												class="btn btn-ghost btn-xs"
											>
												{m.validator_reset_decision()}
											</button>
										{/if}
									</div>
									{#if issue.decisionGroup}
										<p class="mt-2 text-[11px] opacity-70">
											{m.validator_decision_window_note()}
										</p>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</aside>
	</div>
</div>
