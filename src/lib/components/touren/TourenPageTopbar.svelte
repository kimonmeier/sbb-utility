<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';

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
		<p class="text-sm tracking-[0.2em] uppercase opacity-60">Tour planning</p>
		<h1 class="text-3xl font-bold">Meine Touren</h1>
		<p class="mt-1 text-sm opacity-70">Alle dir zugeteilten Touren an einem Ort.</p>
	</div>
	<div class="flex items-center gap-2">
		<form method="POST" action="?/sync" use:enhance={enhanceSync}>
			<button class="btn btn-primary" type="submit" disabled={isSyncing}>
				{#if isSyncing}
					Synchronisiere...
				{:else}
					Touren synchronisieren
				{/if}
			</button>
		</form>
		<a href={resolve('/profile')} class="btn btn-outline">Profil</a>
	</div>
</div>
