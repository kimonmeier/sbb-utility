import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { tokens } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'Action failed. Please try again.';
};

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

export const load: PageServerLoad = async ({ locals, request }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	let passkeys: Array<{ id: string; name?: string | null; createdAt?: Date | null }>;
	let apiKeys: Array<{ id: string; name?: string | null; createdAt: Date }>;
	const userTokens = await db.query.tokens.findMany({
		where: eq(tokens.userId, locals.user.id),
		orderBy: [desc(tokens.expiresAt)]
	});

	try {
		// @ts-expect-error - Better auth types might not infer plugins properly
		passkeys = await auth.api.listPasskeys({ headers: request.headers });
	} catch {
		passkeys = [];
	}

	try {
		// @ts-expect-error - Better auth types might not infer plugins properly
		const keysRes = await auth.api.listApiKeys({ headers: request.headers });
		// Usually returns { apiKeys: [...], total, limit, offset }
		apiKeys = keysRes.apiKeys ?? [];
	} catch {
		apiKeys = [];
	}

	return {
		user: locals.user,
		passkeys,
		apiKeys,
		tokens: userTokens
	};
};

export const actions: Actions = {
	updateProfile: async ({ request }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const image = String(formData.get('image') ?? '').trim();

		if (!name) {
			return fail(400, {
				section: 'profile',
				error: 'Name is required.'
			});
		}

		try {
			await auth.api.updateUser({
				headers: request.headers,
				body: {
					name,
					image: image || undefined
				}
			});
		} catch (error) {
			return fail(400, {
				section: 'profile',
				error: getErrorMessage(error)
			});
		}

		return {
			section: 'profile',
			success: 'Profile updated successfully.'
		};
	},

	changePassword: async ({ request }) => {
		const formData = await request.formData();
		const currentPassword = String(formData.get('currentPassword') ?? '');
		const newPassword = String(formData.get('newPassword') ?? '');

		if (!currentPassword || !newPassword) {
			return fail(400, {
				section: 'password',
				error: 'Current and new password are required.'
			});
		}

		if (newPassword.length < 8) {
			return fail(400, {
				section: 'password',
				error: 'New password must be at least 8 characters long.'
			});
		}

		try {
			await auth.api.changePassword({
				headers: request.headers,
				body: {
					currentPassword,
					newPassword
				}
			});
		} catch (error) {
			return fail(400, {
				section: 'password',
				error: getErrorMessage(error)
			});
		}

		return {
			section: 'password',
			success: 'Password updated successfully.'
		};
	},

	deletePasskey: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');

		if (!id) {
			return fail(400, {
				section: 'passkey',
				error: 'Passkey id is missing.'
			});
		}

		try {
			// @ts-expect-error - Better auth types might not infer plugins properly
			await auth.api.deletePasskey({
				headers: request.headers,
				body: { id }
			});
		} catch (error) {
			return fail(400, {
				section: 'passkey',
				error: getErrorMessage(error)
			});
		}

		return {
			section: 'passkey',
			success: 'Passkey removed.'
		};
	},

	deleteApiKey: async ({ request }) => {
		const formData = await request.formData();
		const keyId = String(formData.get('keyId') ?? '');

		if (!keyId) {
			return fail(400, {
				section: 'apikey',
				error: 'API key id is missing.'
			});
		}

		try {
			// @ts-expect-error - Better auth types might not infer plugins properly
			await auth.api.deleteApiKey({
				headers: request.headers,
				body: { keyId }
			});
		} catch (error) {
			return fail(400, {
				section: 'apikey',
				error: getErrorMessage(error)
			});
		}

		return {
			section: 'apikey',
			success: 'API key removed.'
		};
	},

	addToken: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const formData = await request.formData();
		const token = String(formData.get('token') ?? '').trim();

		if (!token) {
			return fail(400, {
				section: 'token',
				error: 'JWT token is required.'
			});
		}

		const expiresAtMs = getJwtExpMs(token);

		if (!expiresAtMs) {
			return fail(400, {
				section: 'token',
				error: 'Token must be a valid JWT containing an exp claim.'
			});
		}

		try {
			await db.insert(tokens).values({
				userId: locals.user.id,
				token,
				expiresAt: new Date(expiresAtMs)
			});
		} catch (error) {
			return fail(400, {
				section: 'token',
				error: getErrorMessage(error)
			});
		}

		return {
			section: 'token',
			success: 'Token stored successfully.'
		};
	},

	deleteToken: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		const formData = await request.formData();
		const tokenId = String(formData.get('tokenId') ?? '').trim();

		if (!tokenId) {
			return fail(400, {
				section: 'token',
				error: 'Token id is missing.'
			});
		}

		try {
			const deletedRows = await db
				.delete(tokens)
				.where(and(eq(tokens.id, tokenId), eq(tokens.userId, locals.user.id)));

			if (deletedRows.changes === 0) {
				return fail(404, {
					section: 'token',
					error: 'Token not found.'
				});
			}
		} catch (error) {
			return fail(400, {
				section: 'token',
				error: getErrorMessage(error)
			});
		}

		return {
			section: 'token',
			success: 'Token removed.'
		};
	}
};
