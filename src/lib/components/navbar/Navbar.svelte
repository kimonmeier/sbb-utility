<script lang="ts">
	import Logo from '$lib/assets/logo.png';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/client/auth/auth-client';

	const session = authClient.useSession();
</script>

<div class="navbar">
	<div class="navbar-start">
		<img src={Logo} alt="SBB Utility Logo" class="mr-2 h-6" />
		<h1 class="text-sm font-bold">Utility</h1>
	</div>
	<div class="navbar-end">
		<div class="dropdown dropdown-end">
			<div tabindex="0" role="button" class="btn btn-circle btn-ghost">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h7"
					/>
				</svg>
			</div>
			<ul
				tabindex="-1"
				class="dropdown-content menu z-1 mt-3 w-52 menu-sm rounded-box bg-base-200 p-2 shadow"
			>
				<li><a href={resolve('/')} data-sveltekit-preload-data>Home</a></li>
				<li><a href={resolve('/touren')} data-sveltekit-preload-data>Touren</a></li>
				<li><a href={resolve('/arbeitszeit')} data-sveltekit-preload-data>Arbeitszeit</a></li>
				<li><a href={resolve('/validator')} data-sveltekit-preload-data>Validator</a></li>
				<li>
					<details>
						<summary>Auth</summary>
						<ul class="z-2 p-2">
							{#if $session.data}
								<li><a href={resolve('/profile')} data-sveltekit-preload-data>Profile</a></li>
								<li><a href={resolve('/auth/logout')} data-sveltekit-preload-data>Logout</a></li>
							{:else}
								<li><a href={resolve('/auth/login')} data-sveltekit-preload-data>Login</a></li>
								<li>
									<a href={resolve('/auth/register')} data-sveltekit-preload-data>Register</a>
								</li>
							{/if}
						</ul>
					</details>
				</li>
			</ul>
		</div>
	</div>
</div>
