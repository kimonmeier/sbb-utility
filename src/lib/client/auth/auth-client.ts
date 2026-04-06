import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/svelte';
import { apiKeyClient } from '@better-auth/api-key/client';

export const authClient = createAuthClient({
	plugins: [
		passkeyClient(),

		// @ts-expect-error - Better auth types mismatch
		apiKeyClient()
	]
});
