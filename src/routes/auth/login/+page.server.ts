import { auth } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'Login failed. Please try again.';
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/profile');
	}
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(formData.get('password') ?? '');

		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required.',
				email
			});
		}

		try {
			await auth.api.signInEmail({
				headers: request.headers,
				body: {
					email,
					password,
					rememberMe: true
				}
			});
		} catch (error) {
			return fail(400, {
				error: getErrorMessage(error),
				email
			});
		}

		throw redirect(303, '/profile');
	}
};
