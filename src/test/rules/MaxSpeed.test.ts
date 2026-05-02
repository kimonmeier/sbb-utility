import { EW4_A_160 } from '$lib/data/ew4';
import { Re460 } from '$lib/data/re460';
import { RuleEngine } from '$lib/rules/engine';
import { RuleId } from '$lib/rules/ruleId';
import { defaultTrainComposition, type TrainComposition } from '$lib/types/BremsrechnerTypes';
import { expect, test } from 'vitest';

test("MaxSpeedRule should set the train's max speed to the minimum of all vehicles' max speeds", () => {
	const engine = new RuleEngine();
	let train: TrainComposition = defaultTrainComposition([Re460, EW4_A_160]);
	train = engine.processTrain(train);

	expect(train.trainMaxSpeed).toBe(160);
	expect(train.appliedRules.map((r) => r.ruleId)).toContain(RuleId.SetMaxSpeedToMinVehicleMaxSpeed);
});
