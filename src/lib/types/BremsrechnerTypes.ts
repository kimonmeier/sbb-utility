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
	brakeWeights: WagonBrakeWeights;
	hasElectricBrakeController: boolean;
}

export interface LocomotiveDefinition extends BaseVehicleDefinition {
	brakeWeights: LocomotiveBrakeWeights;
	schleppedBrakeWeight: number;
}

export type VehicleStates = LocomotiveVehicleState | WagonVehicleState;

interface VehicleState {
	stateType: VehicleType;
	definition: BaseVehicleDefinition;
	effectiveMaxSpeed: number;
	effectiveBrakeWeight: number;
	isSpeiseleitungCoupled: boolean;
	isZugsammelleitungCoupled: boolean;
	appliedRules: string[];
}

export interface WagonVehicleState extends VehicleState {
	stateType: 'wagon';
	definition: WagonDefinition;
}

export interface LocomotiveVehicleState extends VehicleState {
	stateType: 'locomotive';
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
	appliedRules: string[];
}
