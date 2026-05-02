import type { RuleId } from '$lib/rules/ruleId';
import type { TrainComposition, VehicleStates } from './BremsrechnerTypes';

export interface TrainRule {
	get id(): RuleId;
	get priority(): number;
	isApplicable: (train: TrainComposition) => boolean;
	execute: (train: TrainComposition) => TrainComposition;
}

export interface VehicleRule {
	id: RuleId;
	priority: number;
	isApplicable: (train: TrainComposition) => boolean;
	execute: (
		vehicle: VehicleStates,
		index: number,
		allVehicles: Map<number, VehicleStates>
	) => VehicleStates;
}
