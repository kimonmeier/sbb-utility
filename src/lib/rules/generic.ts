import type { AppliedRule, TrainComposition } from '$lib/types/BremsrechnerTypes';
import type { TrainRule } from '$lib/types/RuleEngine';
import { RuleId } from './ruleId';

const MaxSpeedRuleInfo: AppliedRule = {
	ruleId: RuleId.SetMaxSpeedToMinVehicleMaxSpeed,
	description:
		'Setze die Maximalgeschwindigkeit des Zuges auf die minimale Maximalgeschwindigkeit aller Fahrzeuge',
	type: 'info'
};

const LokZugRule: AppliedRule = {
	ruleId: RuleId.TrainIsLokzug,
	description: 'Lok-Zug maximal R115, vmax 125 km/h',
	type: 'rule'
};

export class MaxSpeedRule implements TrainRule {
	get id(): RuleId {
		return RuleId.SetMaxSpeedToMinVehicleMaxSpeed;
	}
	get priority(): number {
		return 100;
	}

	public isApplicable(): boolean {
		return true; // Diese Regel ist immer anwendbar, da sie die Maximalgeschwindigkeit basierend auf den Fahrzeugen setzt
	}

	public execute(train: TrainComposition): TrainComposition {
		const maxSpeed = Math.min(...train.vehicles.map((v) => v.definition.maxSpeed));

		if (maxSpeed >= train.trainMaxSpeed) {
			return train;
		}

		return {
			...train,
			trainMaxSpeed: maxSpeed,
			appliedRules: [...train.appliedRules, MaxSpeedRuleInfo]
		};
	}
}

export class IsLokZugRule implements TrainRule {
	get id(): RuleId {
		return RuleId.TrainIsLokzug;
	}
	get priority(): number {
		return 10;
	}

	public isApplicable(train: TrainComposition): boolean {
		return train.vehicles.every((v) => v.definition.type === 'locomotive');
	}

	public execute(train: TrainComposition): TrainComposition {
		return {
			...train,
			bremshundertstel: 115,
			trainMaxSpeed: 125,
			appliedRules: [...train.appliedRules, LokZugRule]
		};
	}
}
