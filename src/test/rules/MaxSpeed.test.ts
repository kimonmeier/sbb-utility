import { Re460 } from '$lib/data/re460';
import { RuleEngine } from '$lib/rules/engine';
import { defaultTrainComposition, type TrainComposition } from '$lib/types/BremsrechnerTypes';
import { expect, test } from 'vitest';

test("MaxSpeedRule should set the train's max speed to the minimum of all vehicles' max speeds", () => {
	const engine = new RuleEngine();
	const train: TrainComposition = defaultTrainComposition([Re460, Re460]);
	engine.processTrain(train);

	expect(train.trainMaxSpeed).toBe(125);
	expect(train.appliedRules).toContain('Lok-Zug maximal R115, vmax 125 km/h');
	expect(train.bremshundertstel).toBe(115);
});
