<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form?: ActionData } = $props();
</script>

<div class="mx-auto flex w-full max-w-md grow items-center px-4 py-10">
	<div class="card w-full bg-base-200 shadow-xl">
		<div class="card-body gap-5">
			<div>
				<h1 class="text-2xl font-bold">Create account</h1>
				<p class="mt-1 text-sm opacity-70">Register with Better Auth email and password.</p>
			</div>

			{#if form?.error}
				<div class="alert alert-error">{form.error}</div>
			{/if}

			<form method="POST" class="space-y-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Name</legend>
					<input
						type="text"
						name="name"
						placeholder="Jane Doe"
						value={form?.name ?? ''}
						required
						class="input-bordered input w-full"
					/>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Email</legend>
					<input
						type="email"
						name="email"
						placeholder="you@example.com"
						value={form?.email ?? ''}
						required
						class="input-bordered input w-full"
					/>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Password</legend>
					<input
						type="password"
						name="password"
						placeholder="Min. 8 characters"
						required
						minlength="8"
						class="input-bordered input w-full"
					/>
				</fieldset>

				<button type="submit" class="btn mt-2 w-full btn-primary">Register</button>
			</form>

			<p class="text-sm">
				Already have an account?
				<a href={resolve('/auth/login')} class="link link-primary">Login</a>
			</p>
		</div>
	</div>
</div>
