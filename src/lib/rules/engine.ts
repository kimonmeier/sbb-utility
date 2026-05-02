import type { TrainComposition } from '$lib/types/BremsrechnerTypes';
import type { TrainRuleEngine, VehicleRuleEngine } from '$lib/types/RuleEngine';

export class RuleEngineError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RuleEngineError';
	}
}

export class RuleEngine {
	private vehicleRules: VehicleRuleEngine[] = [];
	private trainRules: TrainRuleEngine[] = [];

	public processTrain(train: TrainComposition): void {
		train.vehicles.forEach((vehicle) => {
			this.vehicleRules.forEach((rule) => {
				try {
					const updatedVehicle = rule(
						vehicle,
						train.vehicles.indexOf(vehicle),
						new Map(train.vehicles.map((v, i) => [i, v]))
					);
					Object.assign(vehicle, updatedVehicle);
				} catch (error) {
					if (error instanceof RuleEngineError) {
						console.error(`Vehicle rule error: ${error.message}`);
					} else {
						console.error(`Unexpected error in vehicle rule: ${error}`);
					}
				}
			});
		});

		this.trainRules.forEach((rule) => {
			try {
				const updatedTrain = rule(train);
				Object.assign(train, updatedTrain);
			} catch (error) {
				if (error instanceof RuleEngineError) {
					console.error(`Train rule error: ${error.message}`);
				} else {
					console.error(`Unexpected error in train rule: ${error}`);
				}
			}
		});
	}
}
