<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { m } from '$lib/paraglide/messages.js';

	let {
		isSyncing,
		enhanceSync
	}: {
		isSyncing: boolean;
		enhanceSync: SubmitFunction;
	} = $props();
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
	<div>
		<p class="text-sm tracking-[0.2em] uppercase opacity-60">{m.touren_planning_label()}</p>
		<h1 class="text-3xl font-bold">{m.touren_heading()}</h1>
		<p class="mt-1 text-sm opacity-70">{m.touren_subheading()}</p>
	</div>
	<div class="flex items-center gap-2">
		<form method="POST" action="?/sync" use:enhance={enhanceSync}>
			<button class="btn btn-primary" type="submit" disabled={isSyncing}>
				{#if isSyncing}
					{m.touren_syncing()}
				{:else}
					{m.touren_sync_button()}
				{/if}
			</button>
		</form>
		<a href={resolve('/profile')} class="btn btn-outline">{m.nav_profile()}</a>
	</div>
</div>
