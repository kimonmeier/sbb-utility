import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tokens } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const getJwtExpMs = (rawToken: string): number | null => {
	const token = rawToken.replace(/^Bearer\s+/i, '').trim();
	const parts = token.split('.');

	if (parts.length !== 3) {
		return null;
	}

	const payload = parts[1];
	const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

	try {
		const decoded = Buffer.from(padded, 'base64').toString('utf-8');
		const parsed = JSON.parse(decoded) as { exp?: number };

		if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) {
			return null;
		}

		return parsed.exp * 1000;
	} catch {
		return null;
	}
};

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
		const token = String(body.token ?? '').trim();

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
