import type { TrainComposition, VehicleStates } from './BremsrechnerTypes';

export type VehicleRuleEngine = (
	currentVehicle: VehicleStates,
	index: number,
	allVehicles: Map<number, VehicleStates>
) => VehicleStates;

export type TrainRuleEngine = (composition: TrainComposition) => TrainComposition;
