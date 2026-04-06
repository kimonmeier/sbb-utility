import type {
	SopreMonthsRequest,
	TourenDetailRequest,
	ZeitkontenPeriodResponse
} from '../../types/SopreTypes';

const BASE_API_ENDPOINT = 'https://sopreweb-tourenplan-api.app.sbb.ch';
const BASE_DETAIL_API_ENDPOINT = 'https://sopreweb-tourdetail-api.app.sbb.ch';
const BASE_ZEITKONTEN_API_ENDPOINT = 'https://sopreweb-zeitkonten-api.app.sbb.ch';

export const sbbClient = {
	async getYear(token: string, year: number): Promise<SopreMonthsRequest | null> {
		try {
			const response = await fetch(
				`${BASE_API_ENDPOINT}/tourenplan/months?datumVon=${year}-01-01&months=12&tourdetail=false`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching SBB token:', error);
			return null;
		}
	},
	async getMonth(token: string, year: number, month: number): Promise<SopreMonthsRequest | null> {
		try {
			const response = await fetch(
				`${BASE_API_ENDPOINT}/tourenplan/months?datumVon=${year}-${month.toString().padStart(2, '0')}-01&months=1&tourdetail=false`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching SBB month data:', error);
			return null;
		}
	},
	async getTourDetail(token: string, tourId: number): Promise<TourenDetailRequest | null> {
		try {
			const response = await fetch(
				`${BASE_DETAIL_API_ENDPOINT}/mitarbeiter/tourendetail?mitarbeiterTourId=${tourId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching SBB tour detail:', error);
			return null;
		}
	},
	async getZeitkontenPeriod(token: string): Promise<ZeitkontenPeriodResponse | null> {
		try {
			const response = await fetch(`${BASE_ZEITKONTEN_API_ENDPOINT}/zeitkonten/period`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error fetching Zeitkonten period data:', error);
			return null;
		}
	}
};
