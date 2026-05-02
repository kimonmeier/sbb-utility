import type { TrainComposition } from '$lib/types/BremsrechnerTypes';
import type { TrainRule, VehicleRule } from '$lib/types/RuleEngine';
import { IsLokZugRule, MaxSpeedRule } from './generic';

export class RuleEngineError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'RuleEngineError';
	}
}

export class RuleEngine {
	constructor(
		private vehicleRules: VehicleRule[] = [],
		private trainRules: TrainRule[] = [new MaxSpeedRule(), new IsLokZugRule()]
	) {}

	public processTrain(initialTrain: TrainComposition): TrainComposition {
		let currentTrain = { ...initialTrain };

		// Kopiere Vehicles, damit wir mutationsfrei bleiben
		currentTrain.vehicles = currentTrain.vehicles.map((vehicle, index) => {
			let currentVehicle = { ...vehicle };

			this.vehicleRules
				.sort((a, b) => b.priority - a.priority)
				.forEach((rule) => {
					try {
						if (rule.isApplicable(currentTrain)) {
							currentVehicle = rule.execute(
								currentVehicle,
								index,
								new Map(currentTrain.vehicles.map((v, i) => [i, v]))
							);
						}
					} catch (error) {
						if (error instanceof RuleEngineError) {
							console.error(`Vehicle rule error: ${error.message}`);
						} else {
							console.error(`Unexpected error in vehicle rule: ${error}`);
						}
					}
				});

			return currentVehicle;
		});

		this.trainRules
			.sort((a, b) => b.priority - a.priority)
			.forEach((rule) => {
				try {
					if (rule.isApplicable(currentTrain)) {
						currentTrain = rule.execute(currentTrain);
					}
				} catch (error) {
					if (error instanceof RuleEngineError) {
						console.error(`Train rule error: ${error.message}`);
					} else {
						console.error(`Unexpected error in train rule: ${error}`);
					}
				}
			});

		return currentTrain;
	}
}
