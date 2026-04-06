<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/client/auth/auth-client';
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
			addPasskeyError = String(result.error.message ?? 'Could not register a passkey.');
			return;
		}

		addPasskeySuccess = 'Passkey added successfully.';
		await invalidateAll();
	};

	const handleAddApiKey = async (e: Event) => {
		e.preventDefault();
		const formEl = e.target as HTMLFormElement;
		const formData = new FormData(formEl);
		const name = String(formData.get('name') ?? '').trim();

		if (!name) {
			addApiKeyError = 'API key name is required.';
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
			addApiKeyError = String(result.error.message ?? 'Could not create an API key.');
			return;
		}

		generatedApiKey = result.data.key;
		addApiKeySuccess =
			'API key created successfully. Please copy it immediately as it will not be shown again.';
		formEl.reset();
		await invalidateAll();
	};
</script>

<div class="mx-auto w-full max-w-3xl grow px-4 py-10">
	<div class="mb-6 flex items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold">Profile</h1>
			<p class="mt-1 text-sm opacity-70">Manage your account, password, and passkeys.</p>
		</div>
		<a href={resolve('/auth/logout')} class="btn btn-outline">Logout</a>
	</div>

	<div class="grid gap-6">
		<section class="card bg-base-200 shadow">
			<div class="card-body">
				<h2 class="card-title">Profile details</h2>

				{#if form?.section === 'profile' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'profile' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}

				<form method="POST" action="?/updateProfile" class="space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Display name</legend>
						<input
							type="text"
							name="name"
							value={data.user.name}
							required
							class="input-bordered input w-full"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Image URL (optional)</legend>
						<input
							type="url"
							name="image"
							value={data.user.image ?? ''}
							placeholder="https://example.com/avatar.png"
							class="input-bordered input w-full"
						/>
					</fieldset>

					<button type="submit" class="btn btn-primary">Save profile</button>
				</form>
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body">
				<h2 class="card-title">Change password</h2>

				{#if form?.section === 'password' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'password' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}

				<form method="POST" action="?/changePassword" class="space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Current password</legend>
						<input
							type="password"
							name="currentPassword"
							required
							class="input-bordered input w-full"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">New password</legend>
						<input
							type="password"
							name="newPassword"
							required
							minlength="8"
							class="input-bordered input w-full"
						/>
					</fieldset>

					<button type="submit" class="btn btn-primary">Update password</button>
				</form>
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body gap-4">
				<h2 class="card-title">Passkeys</h2>

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
						{addPasskeyLoading ? 'Adding passkey...' : 'Add passkey'}
					</button>
				</div>

				{#if data.passkeys.length === 0}
					<p class="text-sm opacity-70">No passkeys registered yet.</p>
				{:else}
					<ul class="space-y-3">
						{#each data.passkeys as passkey (passkey.id)}
							<li class="flex items-center justify-between rounded-lg border border-base-300 p-3">
								<div>
									<p class="font-medium">{passkey.name || 'Unnamed passkey'}</p>
									{#if passkey.createdAt}
										<p class="text-xs opacity-70">
											Added {new Date(passkey.createdAt).toLocaleString()}
										</p>
									{/if}
								</div>
								<form method="POST" action="?/deletePasskey">
									<input type="hidden" name="id" value={passkey.id} />
									<button type="submit" class="btn btn-sm btn-error">Delete</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body">
				<h2 class="card-title">JWT tokens</h2>

				{#if form?.section === 'token' && form?.error}
					<div class="alert alert-error">{form.error}</div>
				{/if}
				{#if form?.section === 'token' && form?.success}
					<div class="alert alert-success">{form.success}</div>
				{/if}

				<form method="POST" action="?/addToken" class="space-y-4">
					<fieldset class="fieldset">
						<legend class="fieldset-legend">JWT token</legend>
						<textarea
							name="token"
							placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
							required
							class="textarea-bordered textarea h-24 w-full"
						></textarea>
					</fieldset>

					<button type="submit" class="btn btn-primary">Store token</button>
				</form>

				{#if data.tokens.length === 0}
					<p class="text-sm opacity-70">No tokens stored yet.</p>
				{:else}
					<ul class="space-y-2">
						{#each data.tokens as savedToken (savedToken.id)}
							<li class="rounded-lg border border-base-300 p-3 text-sm">
								<p class="font-medium">{savedToken.token.slice(0, 12)}...</p>
								<p class="opacity-70">
									Expires {new Date(savedToken.expiresAt).toLocaleString()}
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>

		<section class="card bg-base-200 shadow">
			<div class="card-body gap-4">
				<h2 class="card-title">API Keys</h2>

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
						<p class="font-bold">Your API Key:</p>
						<p class="rounded bg-base-300 p-2 font-mono select-all">{generatedApiKey}</p>
						<p class="text-sm">
							Please store this securely. You will not be able to retrieve it again!
						</p>
					</div>
				{/if}

				<form onsubmit={handleAddApiKey} class="mt-2 flex items-end gap-2">
					<fieldset class="fieldset flex-grow">
						<legend class="fieldset-legend">New API Key Name</legend>
						<input
							type="text"
							name="name"
							placeholder="e.g. My Scripts"
							required
							class="input-bordered input w-full"
							disabled={addApiKeyLoading}
						/>
					</fieldset>
					<button type="submit" class="btn btn-primary" disabled={addApiKeyLoading}>
						{addApiKeyLoading ? 'Creating...' : 'Create API Key'}
					</button>
				</form>

				{#if data.apiKeys.length === 0}
					<p class="text-sm opacity-70">No API keys registered yet.</p>
				{:else}
					<ul class="space-y-3">
						{#each data.apiKeys as apiKey (apiKey.id)}
							<li class="flex items-center justify-between rounded-lg border border-base-300 p-3">
								<div>
									<p class="font-medium">{apiKey.name || 'Unnamed API Key'}</p>
									{#if apiKey.createdAt}
										<p class="text-xs opacity-70">
											Created {new Date(apiKey.createdAt).toLocaleString()}
										</p>
									{/if}
								</div>
								<form method="POST" action="?/deleteApiKey">
									<input type="hidden" name="keyId" value={apiKey.id} />
									<button type="submit" class="btn btn-sm btn-error">Delete</button>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</section>
	</div>
</div>
