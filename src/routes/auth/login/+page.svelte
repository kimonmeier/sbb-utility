<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/client/auth/auth-client';
	import { m } from '$lib/paraglide/messages.js';
	import type { ActionData } from './$types';

	let { form }: { form?: ActionData } = $props();

	let passkeyError = $state('');
	let passkeyLoading = $state(false);

	const loginWithPasskey = async () => {
		passkeyError = '';

		if (typeof window !== 'undefined' && !('PublicKeyCredential' in window)) {
			passkeyError = m.auth_passkeys_not_supported();
			return;
		}

		passkeyLoading = true;
		// @ts-expect-error - Better auth types might not infer plugins properly
		const result = await authClient.signIn.passkey();
		passkeyLoading = false;

		if (result.error) {
			passkeyError = String(result.error.message ?? m.auth_passkey_login_failed());
			return;
		}

		await goto(resolve('/profile'));
	};
</script>

<div class="mx-auto flex w-full max-w-md grow items-center px-4 py-10">
	<div class="card w-full bg-base-200 shadow-xl">
		<div class="card-body gap-5">
			<div>
				<h1 class="text-2xl font-bold">{m.auth_login_title()}</h1>
				<p class="mt-1 text-sm opacity-70">{m.auth_login_subtitle()}</p>
			</div>

			{#if form?.error}
				<div class="alert alert-error">{form.error}</div>
			{/if}

			<form method="POST" class="space-y-4">
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
						placeholder="********"
						required
						class="input-bordered input w-full"
					/>
				</fieldset>

				<button type="submit" class="btn mt-2 w-full btn-primary">{m.auth_login_title()}</button>
			</form>

			<div class="divider">{m.common_or()}</div>

			{#if passkeyError}
				<div class="alert alert-error">{passkeyError}</div>
			{/if}

			<button
				type="button"
				onclick={loginWithPasskey}
				class="btn w-full btn-outline"
				disabled={passkeyLoading}
			>
				{passkeyLoading ? m.auth_waiting_for_passkey() : m.auth_login_with_passkey()}
			</button>

			<p class="text-sm">
				{m.auth_no_account_yet()}
				<a href={resolve('/auth/register')} class="link link-primary">{m.auth_create_one()}</a>
			</p>
		</div>
	</div>
</div>
