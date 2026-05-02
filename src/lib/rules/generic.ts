import type { AppliedRule } from '$lib/types/BremsrechnerTypes';
import type { TrainRuleEngine } from '$lib/types/RuleEngine';

const LokZugRule: AppliedRule = {
	ruleId: 'rule_train_is_lokzug',
	description: 'Lok-Zug maximal R115, vmax 125 km/h',
	type: 'rule'
};

export const MaxSpeedRule: TrainRuleEngine = (train) => {
	const maxSpeed = Math.min(...train.vehicles.map((v) => v.definition.maxSpeed));
	return { ...train, maxSpeed };
};

export const IsLokZugRule: TrainRuleEngine = (train) => {
	const isLokZug = train.vehicles.every((v) => v.stateType === 'locomotive');

	if (!isLokZug) {
		return train;
	}

	return {
		...train,
		bremshundertstel: 115,
		trainMaxSpeed: 125,
		appliedRules: [...train.appliedRules, LokZugRule]
	};
};
