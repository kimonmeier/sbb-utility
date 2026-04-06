import { fail, redirect } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { touren } from '$lib/server/db/schema';
import { synchronizeTouren } from '$lib/server/sbb/tourenLogic';

function requireUserOrRedirect(user: App.Locals['user']) {
	if (!user) {
		throw redirect(303, '/auth/login');
	}

	return user;
}

function toSyncErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return 'Synchronisation fehlgeschlagen.';
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUserOrRedirect(locals.user);

	const assignedTouren = await db.query.touren.findMany({
		where: eq(touren.user, user.id),
		orderBy: [asc(touren.datum), desc(touren.lastEdited)]
	});

	return {
		user,
		touren: assignedTouren
	};
};

export const actions: Actions = {
	sync: async ({ locals }) => {
		const user = requireUserOrRedirect(locals.user);

		try {
			await synchronizeTouren(user.id);
		} catch (error) {
			return fail(500, {
				error: toSyncErrorMessage(error)
			});
		}

		return {
			success: true
		};
	}
};
