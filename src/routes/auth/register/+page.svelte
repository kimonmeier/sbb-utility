<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import type { ActionData } from './$types';

	let { form }: { form?: ActionData } = $props();
</script>

<div class="mx-auto flex w-full max-w-md grow items-center px-4 py-10">
	<div class="card w-full bg-base-200 shadow-xl">
		<div class="card-body gap-5">
			<div>
				<h1 class="text-2xl font-bold">{m.auth_create_account_title()}</h1>
				<p class="mt-1 text-sm opacity-70">{m.auth_register_subtitle()}</p>
			</div>

			{#if form?.error}
				<div class="alert alert-error">{form.error}</div>
			{/if}

			<form method="POST" class="space-y-4">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.auth_name()}</legend>
					<input
						type="text"
						name="name"
						placeholder={m.auth_name_placeholder()}
						value={form?.name ?? ''}
						required
						class="input-bordered input w-full"
					/>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.auth_email()}</legend>
					<input
						type="email"
						name="email"
						placeholder={m.auth_email_placeholder()}
						value={form?.email ?? ''}
						required
						class="input-bordered input w-full"
					/>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">{m.auth_password()}</legend>
					<input
						type="password"
						name="password"
						placeholder={m.auth_password_min_placeholder()}
						required
						minlength="8"
						class="input-bordered input w-full"
					/>
				</fieldset>

				<button type="submit" class="btn mt-2 w-full btn-primary">{m.nav_register()}</button>
			</form>

			<p class="text-sm">
				{m.auth_already_have_account()}
				<a href={resolve('/auth/login')} class="link link-primary">{m.nav_login()}</a>
			</p>
		</div>
	</div>
</div>
