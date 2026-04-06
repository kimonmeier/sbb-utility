import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { passkey } from '@better-auth/passkey';
import { apiKey } from '@better-auth/api-key';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true },
	plugins: [
		passkey(),
		// @ts-expect-error - Better auth types mismatch
		apiKey(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
