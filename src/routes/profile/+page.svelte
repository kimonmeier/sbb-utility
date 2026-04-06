<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/client/auth/auth-client';
	import { m } from '$lib/paraglide/messages.js';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let addPasskeyError = $state('');
	let addPasskeySuccess = $state('');
	let addPasskeyLoading = $state(false);

	let addApiKeyError = $state('');
	let addApiKeySuccess = $state('');
	let addApiKeyLoading = $state(false);
	let generatedApiKey = $state<string | null>(null);

	const handleAddPasskey = async () => {
		addPasskeyError = '';
		addPasskeySuccess = '';
		addPasskeyLoading = true;

		// @ts-expect-error - Better auth types might not infer plugins properly
		const result = await authClient.passkey.addPasskey({
			name: `${data.user.name}'s device`
		});

		addPasskeyLoading = false;

		if (result.error) {
			addPasskeyError = String(result.error.message ?? m.profile_error_register_passkey());
			return;
		}

		addPasskeySuccess = m.profile_passkey_added_success();
		await invalidateAll();
	};

	const handleAddApiKey = async (e: Event) => {
		e.preventDefault();
		const formEl = e.target as HTMLFormElement;
		const formData = new FormData(formEl);
		const name = String(formData.get('name') ?? '').trim();

		if (!name) {
			addApiKeyError = m.profile_error_api_key_name_required();
			return;
		}

		addApiKeyError = '';
		addApiKeySuccess = '';
		addApiKeyLoading = true;
		generatedApiKey = null;

		// @ts-expect-error - Better auth types might not infer plugins properly
		const result = await authClient.apiKey.create({
			name: name
		});

		addApiKeyLoading = false;

		if (result.error) {
			addApiKeyError = String(result.error.message ?? m.profile_error_create_api_key());
			return;
		}

		generatedApiKey = result.data.key;
		addApiKeySuccess = m.profile_api_key_created_success();
		formEl.reset();
		await invalidateAll();
	};
</script>

<div class="mx-auto w-full max-w-3xl grow px-4 py-10">
	<div class="mb-6 flex items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">{m.profile_title()}</h1>
			<p class="mt-1 text-sm opacity-70">{m.profile_subtitle()}</p>
		</div>
		<a href={resolve('/auth/logout')} class="btn btn-outline">{m.nav_logout()}</a>
	</div>

	<div class="grid gap-6">
		<section class="card bg-base-200 shadow">
			<div class="card-body">
				<h2 class="card-title">{m.profile_details_title()}</h2>

				{#if form?.section === 'profile' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'profile' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}

				<form method="POST" action="?/updateProfile" class="space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.profile_display_name()}</legend>
						<input
							type="text"
							name="name"
							value={data.user.name}
							required
							class="input-bordered input w-full"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.profile_image_url_optional()}</legend>
						<input
							type="url"
							name="image"
							value={data.user.image ?? ''}
							placeholder={m.profile_image_url_placeholder()}
							class="input-bordered input w-full"
						/>
					</fieldset>

					<button type="submit" class="btn btn-primary">{m.profile_save_profile()}</button>
				</form>
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body">
				<h2 class="card-title">{m.profile_change_password_title()}</h2>

				{#if form?.section === 'password' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'password' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}

				<form method="POST" action="?/changePassword" class="space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.profile_current_password()}</legend>
						<input
							type="password"
							name="currentPassword"
							required
							class="input-bordered input w-full"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.profile_new_password()}</legend>
						<input
							type="password"
							name="newPassword"
							required
							minlength="8"
							class="input-bordered input w-full"
						/>
					</fieldset>

					<button type="submit" class="btn btn-primary">{m.profile_update_password()}</button>
				</form>
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body gap-4">
				<h2 class="card-title">{m.profile_passkeys_title()}</h2>

				{#if form?.section === 'passkey' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'passkey' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}
				{#if addPasskeyError}
					<div class="alert alert-error">{addPasskeyError}</div>
				{/if}
				{#if addPasskeySuccess}
					<div class="alert alert-success">{addPasskeySuccess}</div>
				{/if}

				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						onclick={handleAddPasskey}
						class="btn btn-primary"
						disabled={addPasskeyLoading}
					>
						{addPasskeyLoading ? m.profile_adding_passkey() : m.profile_add_passkey()}
					</button>
				</div>

				{#if data.passkeys.length === 0}
					<p class="text-sm opacity-70">{m.profile_no_passkeys()}</p>
				{:else}
					<ul class="space-y-3">
						{#each data.passkeys as passkey (passkey.id)}
							<li class="flex items-center justify-between rounded-lg border border-base-300 p-3">
								<div>
									<p class="font-medium">{passkey.name || m.profile_unnamed_passkey()}</p>
									{#if passkey.createdAt}
										<p class="text-xs opacity-70">
											{m.profile_added_at({ date: new Date(passkey.createdAt).toLocaleString() })}
										</p>
									{/if}
								</div>
								<form method="POST" action="?/deletePasskey">
									<input type="hidden" name="id" value={passkey.id} />
									<button type="submit" class="btn btn-sm btn-error">{m.common_delete()}</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body">
				<h2 class="card-title">{m.profile_jwt_tokens_title()}</h2>

				{#if form?.section === 'token' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'token' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}

				<form method="POST" action="?/addToken" class="space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">{m.profile_jwt_token_label()}</legend>
						<textarea
							name="token"
							placeholder={m.profile_jwt_token_placeholder()}
							required
							class="textarea-bordered textarea h-24 w-full"
						></textarea>
					</fieldset>

					<button type="submit" class="btn btn-primary">{m.profile_store_token()}</button>
				</form>

				{#if data.tokens.length === 0}
					<p class="text-sm opacity-70">{m.profile_no_tokens()}</p>
				{:else}
					<ul class="space-y-2">
						{#each data.tokens as savedToken (savedToken.id)}
							<li
								class="flex items-center justify-between gap-3 rounded-lg border border-base-300 p-3 text-sm"
							>
								<div>
									<p class="font-medium">{savedToken.token.slice(0, 12)}...</p>
									<p class="opacity-70">
										{m.profile_expires_at({
											date: new Date(savedToken.expiresAt).toLocaleString()
										})}
									</p>
								</div>
								<form method="POST" action="?/deleteToken">
									<input type="hidden" name="tokenId" value={savedToken.id} />
									<button type="submit" class="btn btn-sm btn-error">{m.common_delete()}</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body gap-4">
				<h2 class="card-title">{m.profile_api_keys_title()}</h2>

				{#if form?.section === 'apikey' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'apikey' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}
				{#if addApiKeyError}
					<div class="alert alert-error">{addApiKeyError}</div>
				{/if}
				{#if addApiKeySuccess}
					<div class="alert alert-success">{addApiKeySuccess}</div>
				{/if}
				{#if generatedApiKey}
					<div class="alert alert-warning">
						<p class="font-bold">{m.profile_your_api_key()}</p>
						<p class="rounded bg-base-300 p-2 font-mono select-all">{generatedApiKey}</p>
						<p class="text-sm">
							{m.profile_store_api_key_securely()}
						</p>
					</div>
				{/if}

				<form onsubmit={handleAddApiKey} class="mt-2 flex items-end gap-2">
					<fieldset class="fieldset grow">
						<legend class="fieldset-legend">{m.profile_new_api_key_name()}</legend>
						<input
							type="text"
							name="name"
							placeholder={m.profile_api_key_name_placeholder()}
							required
							class="input-bordered input w-full"
							disabled={addApiKeyLoading}
						/>
					</fieldset>
					<button type="submit" class="btn btn-primary" disabled={addApiKeyLoading}>
						{addApiKeyLoading ? m.profile_creating() : m.profile_create_api_key()}
					</button>
				</form>

				{#if data.apiKeys.length === 0}
					<p class="text-sm opacity-70">{m.profile_no_api_keys()}</p>
				{:else}
					<ul class="space-y-3">
						{#each data.apiKeys as apiKey (apiKey.id)}
							<li class="flex items-center justify-between rounded-lg border border-base-300 p-3">
								<div>
									<p class="font-medium">{apiKey.name || m.profile_unnamed_api_key()}</p>
									{#if apiKey.createdAt}
										<p class="text-xs opacity-70">
											{m.profile_created_at({ date: new Date(apiKey.createdAt).toLocaleString() })}
										</p>
									{/if}
								</div>
								<form method="POST" action="?/deleteApiKey">
									<input type="hidden" name="keyId" value={apiKey.id} />
									<button type="submit" class="btn btn-sm btn-error">{m.common_delete()}</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	</div>
</div>
