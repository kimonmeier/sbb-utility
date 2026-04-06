<script lang="ts">
	import BackgroundPhoto from '$lib/assets/background.jpg';
	import { m } from '$lib/paraglide/messages.js';
</script>

<div class="flex grow flex-col gap-6 overflow-hidden">
	<div
		class="relative flex grow items-center justify-center px-4 pt-32 pb-20 text-center lg:pt-48 lg:pb-32"
	>
		<img
			src={BackgroundPhoto}
			alt={m.common_sbb_utility_logo_alt()}
			loading="lazy"
			class="absolute -z-1 min-h-full min-w-full object-cover blur-[25px]"
		/>
		<div class="mx-auto h-[50vh] w-full text-center">
			<h1 class="mb-10 text-9xl"><span class="text-red-500">SBB</span> Utility</h1>
			<p class="mb-10 text-6xl text-base-content">{m.home_welcome()}</p>
			<p class="text-lg text-base-content/50">
				{m.home_intro_disclaimer()}
			</p>
		</div>
	</div>
</div>
