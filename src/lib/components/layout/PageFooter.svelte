<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<div class="sticky bottom-0 z-1 h-20 w-full rounded-t-lg bg-base-200 p-4 shadow">
	<div class="flex h-full flex-row items-center justify-between">
		<div class="flex flex-col items-center gap-4">
			<p class="text-sm">{m.footer_copyright()}</p>
			<p class="text-sm text-red-500">{m.footer_disclaimer()}</p>
		</div>
		<div class="flex flex-row items-center gap-4">
			<a href="https://github.com/kimonmeier" target="about:blank">{m.footer_github()}</a>
		</div>
	</div>
</div>
