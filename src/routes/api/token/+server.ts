import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tokens } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { getJwtExpMs } from '$lib/server/auth/jwt';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let userId: string | undefined;

	const authHeader = request.headers.get('authorization');
	const apiKeyHeader = request.headers.get('x-api-key');

	let apiKeyToVerify = apiKeyHeader;
	if (!apiKeyToVerify && authHeader?.startsWith('Bearer ')) {
		apiKeyToVerify = authHeader.substring(7);
	}

	if (apiKeyToVerify) {
		try {
			// @ts-expect-error - Better auth types might not infer plugins properly
			const verifyAPI = await auth.api.verifyApiKey({
				headers: request.headers,
				body: { key: apiKeyToVerify }
			});
			if (verifyAPI?.valid && verifyAPI.key) {
				userId = verifyAPI.key.referenceId;
			}
		} catch (error) {
			console.error('API Key verification failed:', error);
		}
	}

	if (!userId) {
		try {
			const session = await auth.api.getSession({ headers: request.headers });
			if (session?.user) {
				userId = session.user.id;
			}
		} catch (error: Error | unknown) {
			console.error('Session verification failed:', (error as Error).message || error);
			return json({ error: 'Unauthorized. Valid API Key or session required.' }, { status: 401 });
		}
	}

	if (!userId) {
		return json({ error: 'Unauthorized. Valid API Key or session required.' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const token = (body.token ?? '').trim();

		if (!token) {
			return json({ error: 'JWT token is required.' }, { status: 400 });
		}

		const expiresAtMs = getJwtExpMs(token);

		if (!expiresAtMs) {
			return json({ error: 'Token must be a valid JWT containing an exp claim.' }, { status: 400 });
		}

		await db.insert(tokens).values({
			userId,
			token,
			expiresAt: new Date(expiresAtMs)
		});

		return json({ success: true, message: 'Token stored successfully.' });
	} catch (error: Error | unknown) {
		return json({ error: (error as Error).message || 'Server error' }, { status: 500 });
	}
};
