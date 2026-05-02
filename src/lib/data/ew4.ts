import type {
	VehicleType,
	WagonBrakeWeights,
	WagonDefinition,
	WagonType
} from '$lib/types/BremsrechnerTypes';

const EW4_BaseDefinition = {
	type: 'WAGON' as VehicleType,
	wagonType: 'EW4' as WagonType,
	lengthOverBuffers: 26.4,
	maxSpeed: 200,
	totalWeight: 50,
	selfWeight: 45,
	handbrakeForce: 18,
	isSteuerwagen: false
};

const EW4_BRAKE_WEIGHTS: WagonBrakeWeights = {
	rMg: 84,
	rSbRed: 74,
	rBlack: 69,
	ric: 51
};

const EW4_A_200: WagonDefinition = {
	...EW4_BaseDefinition,
	brakeWeights: EW4_BRAKE_WEIGHTS,
	class: 'A',
	hasElectricBrakeController: false,
	uicNumberStart: '508510-95000',
	uicNumberEnd: '508510-95219'
};

const EW4_A_160: WagonDefinition = {
	...EW4_BaseDefinition,
	brakeWeights: EW4_BRAKE_WEIGHTS,
	class: 'A',
	hasElectricBrakeController: false,
	uicNumberStart: '508510-75021',
	uicNumberEnd: '508510-75203',
	maxSpeed: 160
};

const EW4_B_160: WagonDefinition = {
	...EW4_BaseDefinition,
	brakeWeights: EW4_BRAKE_WEIGHTS,
	class: 'B',
	hasElectricBrakeController: false,
	uicNumberStart: '508521-75004',
	uicNumberEnd: '508521-75259',
	maxSpeed: 160
};

const EW4_B_200_1: WagonDefinition = {
	...EW4_BaseDefinition,
	brakeWeights: EW4_BRAKE_WEIGHTS,
	class: 'B',
	hasElectricBrakeController: false,
	uicNumberStart: '508520-95601',
	uicNumberEnd: '508520-95639',
	maxSpeed: 200
};

const EW4_B_200_2: WagonDefinition = {
	...EW4_BaseDefinition,
	brakeWeights: EW4_BRAKE_WEIGHTS,
	class: 'B',
	hasElectricBrakeController: false,
	uicNumberStart: '508521-95000',
	uicNumberEnd: '508521-95292',
	maxSpeed: 200
};

const EW4_B_200_FANZUEGE: WagonDefinition = {
	...EW4_BaseDefinition,
	brakeWeights: EW4_BRAKE_WEIGHTS,
	class: 'B',
	hasElectricBrakeController: false,
	uicNumberStart: '508521-95312',
	uicNumberEnd: '508521-95335',
	maxSpeed: 200
};

const EW4_BT_BASE: WagonDefinition = {
	type: 'wagon' as VehicleType,
	class: 'BT',
	wagonType: 'EW4' as WagonType,
	brakeWeights: {
		rMg: 102,
		rEp: 81,
		rSbRed: 77,
		rBlack: 72,
		ric: 57
	},
	lengthOverBuffers: 26.4,
	maxSpeed: 200,
	selfWeight: 48,
	totalWeight: 54,
	handbrakeForce: 24,
	hasElectricBrakeController: true,
	uicNumberStart: '508528-94960',
	uicNumberEnd: '508528-94989',
	isSteuerwagen: true
};

const EW4_BT_MODERN: WagonDefinition = {
	type: 'wagon' as VehicleType,
	class: 'BT',
	wagonType: 'EW4' as WagonType,
	brakeWeights: {
		rMg: 106,
		rEp: 85,
		rSbRed: 81,
		rBlack: 76,
		ric: 59
	},
	lengthOverBuffers: 26.4,
	maxSpeed: 200,
	selfWeight: 48,
	totalWeight: 56,
	handbrakeForce: 24,
	hasElectricBrakeController: true,
	uicNumberStart: '508528-94900',
	uicNumberEnd: '508528-94959',
	isSteuerwagen: true
};

export const EW4_WAGONS: WagonDefinition[] = [
	EW4_A_200,
	EW4_A_160,
	EW4_B_160,
	EW4_B_200_1,
	EW4_B_200_2,
	EW4_B_200_FANZUEGE,
	EW4_BT_BASE,
	EW4_BT_MODERN
];
