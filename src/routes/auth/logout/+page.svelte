<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<div class="mx-auto flex w-full max-w-md grow items-center px-4 py-10">
	<div class="card w-full bg-base-200 shadow-xl">
		<div class="card-body gap-5">
			<div>
				<h1 class="text-2xl font-bold">{m.nav_logout()}</h1>
				<p class="mt-1 text-sm opacity-70">{m.auth_logout_confirm()}</p>
			</div>

			<form method="POST">
				<button type="submit" class="btn w-full btn-error">{m.auth_sign_out()}</button>
			</form>
		</div>
	</div>
</div>
