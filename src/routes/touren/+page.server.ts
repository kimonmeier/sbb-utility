import { fail, redirect } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { touren } from '$lib/server/db/schema';
import { synchronizeTouren } from '$lib/server/sbb/tourenLogic';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	const assignedTouren = await db.query.touren.findMany({
		where: eq(touren.user, locals.user.id),
		orderBy: [asc(touren.datum), desc(touren.lastEdited)]
	});

	return {
		user: locals.user,
		touren: assignedTouren
	};
};

export const actions: Actions = {
	sync: async ({ locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login');
		}

		try {
			await synchronizeTouren(locals.user.id);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Synchronisation fehlgeschlagen.';
			return fail(500, {
				error: message
			});
		}

		return {
			success: true
		};
	}
};
