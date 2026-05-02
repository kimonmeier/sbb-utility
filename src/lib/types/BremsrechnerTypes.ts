import type { RuleId } from '$lib/rules/ruleId';

export type VehicleType = 'wagon' | 'locomotive';
export type VehicleClass =
	| 'A'
	| 'ABT'
	| 'AD'
	| 'AS'
	| 'APM'
	| 'B'
	| 'BT'
	| 'BR'
	| 'BPM'
	| 'WRB'
	| 'WRM'
	| 'SRM';

export type LocomotiveType = 'Re460';
export type WagonType = 'EW4' | 'IC2000';
export type TrainCategory = 'N' | 'R' | 'A';

export interface WagonBrakeWeights {
	rMg: number;
	rEp?: number;
	rSbRed: number;
	rBlack: number;
	ric: number;
}

export interface LocomotiveBrakeWeights {
	r: number;
	p: number;
}

interface BaseVehicleDefinition {
	type: VehicleType;
	uicNumberStart: string;
	uicNumberEnd: string;
	maxSpeed: number;
	lengthOverBuffers: number;
	selfWeight?: number;
	totalWeight: number;
	handbrakeForce: number;
}

export interface WagonDefinition extends BaseVehicleDefinition {
	class: VehicleClass;
	wagonType: WagonType;
	brakeWeights: WagonBrakeWeights;
	hasElectricBrakeController: boolean;
	isSteuerwagen: boolean;
}

export interface LocomotiveDefinition extends BaseVehicleDefinition {
	locomotiveType: LocomotiveType;
	brakeWeights: LocomotiveBrakeWeights;
	schleppedBrakeWeight: number;
}

export type VehicleStates = LocomotiveVehicleState | WagonVehicleState;

export type AppliedRule = {
	ruleId: RuleId;
	description: string;
	type: 'rule' | 'info' | 'warning' | 'error';
};

interface VehicleState {
	definition: BaseVehicleDefinition;
	effectiveMaxSpeed: number;
	effectiveBrakeWeight: number;
	isSpeiseleitungCoupled: boolean;
	isZugsammelleitungCoupled: boolean;
	isEpCoupled: boolean;
	isBrakeEnabled: boolean;
	appliedRules: AppliedRule[];
}

export interface WagonVehicleState extends VehicleState {
	definition: WagonDefinition;
	isBremsrechnerEnabled: boolean;
}

export interface LocomotiveVehicleState extends VehicleState {
	definition: LocomotiveDefinition;
	isSchlepped: boolean;
}

export interface TrainComposition {
	vehicles: VehicleStates[];
	totalLength: number;
	totalWeight: number;
	totalEffectiveBrakeWeight: number;
	trainMaxSpeed: number;
	bremshundertstel: number;
	trainCategory: TrainCategory;
	appliedRules: AppliedRule[];
}

export function defaultVehicleState(vehicle: BaseVehicleDefinition): VehicleStates {
	if (vehicle.type === 'locomotive') {
		const locoDef = vehicle as LocomotiveDefinition;

		return {
			definition: locoDef,
			effectiveMaxSpeed: locoDef.maxSpeed,
			effectiveBrakeWeight: locoDef.brakeWeights.r,
			isSpeiseleitungCoupled: false,
			isZugsammelleitungCoupled: false,
			isSchlepped: false,
			isBrakeEnabled: true,
			isEpCoupled: true,
			appliedRules: []
		};
	} else {
		const wagonDef = vehicle as WagonDefinition;

		return {
			definition: wagonDef,
			effectiveMaxSpeed: wagonDef.maxSpeed,
			effectiveBrakeWeight: wagonDef.brakeWeights.rMg,
			isSpeiseleitungCoupled: false,
			isZugsammelleitungCoupled: false,
			isBrakeEnabled: true,
			isBremsrechnerEnabled: true,
			isEpCoupled: true,
			appliedRules: []
		};
	}
}

export function defaultTrainComposition(vehicles: BaseVehicleDefinition[]): TrainComposition {
	const vehicleStates = vehicles.map((v) => defaultVehicleState(v));
	const totalWeight = vehicleStates.reduce((sum, v) => sum + v.definition.totalWeight, 0);
	const totalBrakeWeight = vehicleStates.reduce((sum, v) => sum + v.effectiveBrakeWeight, 0);

	return {
		vehicles: vehicleStates,
		totalLength: vehicleStates.reduce((sum, v) => sum + v.definition.lengthOverBuffers, 0),
		totalWeight: totalWeight,
		totalEffectiveBrakeWeight: totalBrakeWeight,
		trainMaxSpeed: Math.min(
			...vehicleStates
				.filter((x) => x.definition.type === 'locomotive')
				.map((v) => v.effectiveMaxSpeed)
		),
		bremshundertstel: (totalBrakeWeight / totalWeight) * 100,
		trainCategory: 'R',
		appliedRules: []
	};
}
