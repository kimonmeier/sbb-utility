import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';
import type { SopreDepot, SopreTourType } from '../../types/SopreTypes';

export const task = sqliteTable('task', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const tokens = sqliteTable('tokens', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	token: text('token').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
});

export type SBBUtilityTouren = typeof touren.$inferInsert;

export type SBBUtilityZeitkontoSnapshot = typeof zeitkontenSnapshots.$inferInsert;

export const touren = sqliteTable(
	'assigned_touren',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		datum: integer('datum').notNull(),
		user: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		abkuerzung: text('abkuerzung').$type<SopreTourType>(),
		tourNumber: integer('tour_number'),
		tourSuffix: text('tour_suffix'),
		aenderungKommentar: text('aenderung_kommentar'),
		schichtdauer: integer('schichtdauer'),
		arbeitszeit: integer('arbeitszeit'),
		bezahlteZeit: integer('bezahlte_zeit'),
		bezahltePause: integer('bezahlte_pause'),
		depot: text('depot').$type<SopreDepot>(),
		lastEdited: integer('last_edited', { mode: 'timestamp' }),
		startTime: integer('start_time', { mode: 'timestamp' }),
		endTime: integer('end_time', { mode: 'timestamp' })
	},
	(table) => [unique().on(table.user, table.datum)]
);

export const zeitkontenSnapshots = sqliteTable(
	'zeitkonten_snapshots',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		user: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		snapshotDate: text('snapshot_date').notNull(),
		capturedAt: integer('captured_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		sapLeaveTypeId: text('sap_leave_type_id').notNull(),
		zeitsaldoBeschreibung: text('zeitsaldo_beschreibung').notNull(),
		anzahl: text('anzahl').notNull()
	},
	(table) => [unique().on(table.user, table.snapshotDate, table.sapLeaveTypeId)]
);

export * from './auth.schema';
