import type { LocomotiveDefinition } from '$lib/types/BremsrechnerTypes';

export const Re460: LocomotiveDefinition = {
	type: 'locomotive',
	uicNumberStart: '91854460000',
	uicNumberEnd: '91854460118',
	maxSpeed: 200,
	handbrakeForce: 70,
	lengthOverBuffers: 18.9,
	totalWeight: 84,
	schleppedBrakeWeight: 57,
	brakeWeights: {
		r: 105,
		p: 76
	}
};
