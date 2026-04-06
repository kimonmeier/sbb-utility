import { auth } from '$lib/server/auth';
import { getJwtExpMs } from '$lib/server/auth/jwt';
import { db } from '$lib/server/db';
import { tokens } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type ProfileActionSection = 'profile' | 'password' | 'passkey' | 'apikey' | 'token';

const requireUserOrRedirect = (user: App.Locals['user']) => {
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	return user;
};

const readFormString = (formData: FormData, key: string): string =>
	String(formData.get(key) ?? '').trim();

const actionFailure = (status: 400 | 404, section: ProfileActionSection, error: string) =>
	fail(status, { section, error });

const actionSuccess = (section: ProfileActionSection, success: string) => ({ section, success });

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'Action failed. Please try again.';
};

export const load: PageServerLoad = async ({ locals, request }) => {
	const user = requireUserOrRedirect(locals.user);

	let passkeys: Array<{ id: string; name?: string | null; createdAt?: Date | null }>;
	let apiKeys: Array<{ id: string; name?: string | null; createdAt: Date }>;
	const userTokens = await db.query.tokens.findMany({
		where: eq(tokens.userId, user.id),
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
		user,
		passkeys,
		apiKeys,
		tokens: userTokens
	};
};

export const actions: Actions = {
	updateProfile: async ({ request }) => {
		const formData = await request.formData();
		const name = readFormString(formData, 'name');
		const image = readFormString(formData, 'image');

		if (!name) {
			return actionFailure(400, 'profile', 'Name is required.');
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
			return actionFailure(400, 'profile', getErrorMessage(error));
		}

		return actionSuccess('profile', 'Profile updated successfully.');
	},

	changePassword: async ({ request }) => {
		const formData = await request.formData();
		const currentPassword = readFormString(formData, 'currentPassword');
		const newPassword = readFormString(formData, 'newPassword');

		if (!currentPassword || !newPassword) {
			return actionFailure(400, 'password', 'Current and new password are required.');
		}

		if (newPassword.length < 8) {
			return actionFailure(400, 'password', 'New password must be at least 8 characters long.');
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
			return actionFailure(400, 'password', getErrorMessage(error));
		}

		return actionSuccess('password', 'Password updated successfully.');
	},

	deletePasskey: async ({ request }) => {
		const formData = await request.formData();
		const id = readFormString(formData, 'id');

		if (!id) {
			return actionFailure(400, 'passkey', 'Passkey id is missing.');
		}

		try {
			// @ts-expect-error - Better auth types might not infer plugins properly
			await auth.api.deletePasskey({
				headers: request.headers,
				body: { id }
			});
		} catch (error) {
			return actionFailure(400, 'passkey', getErrorMessage(error));
		}

		return actionSuccess('passkey', 'Passkey removed.');
	},

	deleteApiKey: async ({ request }) => {
		const formData = await request.formData();
		const keyId = readFormString(formData, 'keyId');

		if (!keyId) {
			return actionFailure(400, 'apikey', 'API key id is missing.');
		}

		try {
			// @ts-expect-error - Better auth types might not infer plugins properly
			await auth.api.deleteApiKey({
				headers: request.headers,
				body: { keyId }
			});
		} catch (error) {
			return actionFailure(400, 'apikey', getErrorMessage(error));
		}

		return actionSuccess('apikey', 'API key removed.');
	},

	addToken: async ({ request, locals }) => {
		const user = requireUserOrRedirect(locals.user);

		const formData = await request.formData();
		const token = readFormString(formData, 'token');

		if (!token) {
			return actionFailure(400, 'token', 'JWT token is required.');
		}

		const expiresAtMs = getJwtExpMs(token);

		if (!expiresAtMs) {
			return actionFailure(400, 'token', 'Token must be a valid JWT containing an exp claim.');
		}

		try {
			await db.insert(tokens).values({
				userId: user.id,
				token,
				expiresAt: new Date(expiresAtMs)
			});
		} catch (error) {
			return actionFailure(400, 'token', getErrorMessage(error));
		}

		return actionSuccess('token', 'Token stored successfully.');
	},

	deleteToken: async ({ request, locals }) => {
		const user = requireUserOrRedirect(locals.user);

		const formData = await request.formData();
		const tokenId = readFormString(formData, 'tokenId');

		if (!tokenId) {
			return actionFailure(400, 'token', 'Token id is missing.');
		}

		try {
			const deletedRows = await db
				.delete(tokens)
				.where(and(eq(tokens.id, tokenId), eq(tokens.userId, user.id)));

			if (deletedRows.changes === 0) {
				return actionFailure(404, 'token', 'Token not found.');
			}
		} catch (error) {
			return actionFailure(400, 'token', getErrorMessage(error));
		}

		return actionSuccess('token', 'Token removed.');
	}
};
