import { redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { touren } from '$lib/server/db/schema';
import { validateTourenByDay } from '$lib/server/sbb/touren-validator';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	const assignedTouren = await db.query.touren.findMany({
		where: eq(touren.user, locals.user.id),
		orderBy: [asc(touren.datum)]
	});

	const validations = validateTourenByDay(assignedTouren);

	return {
		touren: assignedTouren,
		validations
	};
};
