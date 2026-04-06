<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import PageFooter from '$lib/components/layout/PageFooter.svelte';
	import Loader from '$lib/components/loading/Loader.svelte';

	let { children } = $props();

	let isLoading = $state(false);

	beforeNavigate(() => (isLoading = true));
	afterNavigate(() => (isLoading = false));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{#if isLoading}
	<Loader />
{:else}
	<div class="flex min-h-screen flex-col">
		<PageHeader />
		{@render children()}
		<PageFooter />
	</div>
{/if}
