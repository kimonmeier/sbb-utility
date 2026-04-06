import { auth } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'Registration failed. Please try again.';
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/profile');
	}
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();
		const email = String(formData.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(formData.get('password') ?? '');

		if (!name || !email || !password) {
			return fail(400, {
				error: 'Name, email, and password are required.',
				name,
				email
			});
		}

		if (password.length < 8) {
			return fail(400, {
				error: 'Password must be at least 8 characters long.',
				name,
				email
			});
		}

		try {
			await auth.api.signUpEmail({
				headers: request.headers,
				body: {
					name,
					email,
					password
				}
			});
		} catch (error) {
			return fail(400, {
				error: getErrorMessage(error),
				name,
				email
			});
		}

		throw redirect(303, '/profile');
	}
};
