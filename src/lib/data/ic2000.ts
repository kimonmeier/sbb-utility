import {
	VehicleClass,
	VehicleType,
	type WagonBrakeWeights,
	type WagonDefinition,
	type WagonType
} from '$lib/types/BremsrechnerTypes';

const IC2000_BaseDefinition = {
	type: VehicleType.Wagon,
	wagonType: 'IC2000' as WagonType,
	maxSpeed: 200,
	brakeWeights: {
		rMg: 111,
		rEp: 91,
		rSbRed: 86,
		rBlack: 81,
		ric: 65
	} as WagonBrakeWeights,
	lengthOverBuffers: 26.8,
	selfWeight: 47,
	totalWeight: 60,
	handbrakeForce: 0,
	hasElectricBrakeController: true,
	isSteuerwagen: false
};

const IC2000_A: WagonDefinition = {
	...IC2000_BaseDefinition,
	class: VehicleClass.A,
	uicNumberStart: '508516-94000',
	uicNumberEnd: '508516-94079'
};

const IC2000_AS: WagonDefinition = {
	...IC2000_BaseDefinition,
	class: VehicleClass.AS,
	uicNumberStart: '508516-94154',
	uicNumberEnd: '508516-94185'
};

const IC2000_B: WagonDefinition = {
	...IC2000_BaseDefinition,
	class: VehicleClass.B,
	uicNumberStart: '508526-94000',
	uicNumberEnd: '508526-94148'
};

const IC2000_BT: WagonDefinition = {
	...IC2000_BaseDefinition,
	class: VehicleClass.BT,
	uicNumberStart: '508526-94900',
	uicNumberEnd: '508526-94939',
	isSteuerwagen: true
};

const IC2000_AD: WagonDefinition = {
	...IC2000_BaseDefinition,
	class: VehicleClass.AD,
	uicNumberStart: '508586-94000',
	uicNumberEnd: '508586-94039'
};

const IC2000_BR: WagonDefinition = {
	...IC2000_BaseDefinition,
	class: VehicleClass.BR,
	uicNumberStart: '508566-94016',
	uicNumberEnd: '508566-94025'
};

const IC2000_WRB: WagonDefinition = {
	...IC2000_BaseDefinition,
	class: VehicleClass.WRB,
	uicNumberStart: '508588-94000',
	uicNumberEnd: '508588-94015'
};

export const IC2000_WAGONS: WagonDefinition[] = [
	IC2000_A,
	IC2000_AS,
	IC2000_B,
	IC2000_BT,
	IC2000_AD,
	IC2000_BR,
	IC2000_WRB
];
