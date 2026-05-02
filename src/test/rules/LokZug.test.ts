import { Re460 } from '$lib/data/re460';
import { RuleEngine } from '$lib/rules/engine';
import { RuleId } from '$lib/rules/ruleId';
import { defaultTrainComposition, type TrainComposition } from '$lib/types/BremsrechnerTypes';
import { expect, test } from 'vitest';

test('LokZugRule should be applicable for trains with only locomotives and no wagons', () => {
	const engine = new RuleEngine();
	let train: TrainComposition = defaultTrainComposition([Re460, Re460]);
	train = engine.processTrain(train);

	expect(train.trainMaxSpeed).toBe(125);
	expect(train.appliedRules.map((r) => r.ruleId)).toContain(RuleId.TrainIsLokzug);
	expect(train.bremshundertstel).toBe(115);
});
