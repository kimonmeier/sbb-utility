import type {
	SopreMonthsRequest,
	TourenDetailRequest,
	ZeitkontenPeriodResponse
} from '$lib/types/SopreTypes';

const BASE_API_ENDPOINT = 'https://sopreweb-tourenplan-api.app.sbb.ch';
const BASE_DETAIL_API_ENDPOINT = 'https://sopreweb-tourdetail-api.app.sbb.ch';
const BASE_ZEITKONTEN_API_ENDPOINT = 'https://sopreweb-zeitkonten-api.app.sbb.ch';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE_MS = 500;

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableStatus(status: number): boolean {
	return RETRYABLE_STATUS_CODES.has(status);
}

async function requestJsonWithRetry<T>(
	url: string,
	init: RequestInit,
	requestLabel: string
): Promise<T | null> {
	for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
		let response: Response;

		try {
			response = await fetch(url, init);
		} catch (error) {
			if (attempt >= MAX_RETRY_ATTEMPTS) {
				console.error(`${requestLabel} failed after ${MAX_RETRY_ATTEMPTS} attempts:`, error);
				return null;
			}

			await sleep(RETRY_BACKOFF_BASE_MS * 2 ** (attempt - 1));
			continue;
		}

		if (!response.ok) {
			const shouldRetryStatus = isRetryableStatus(response.status) && attempt < MAX_RETRY_ATTEMPTS;

			if (!shouldRetryStatus) {
				const responseJson = await response.json().catch(() => ({}));
				console.error(
					`${requestLabel} failed with status ${response.status}${Object.keys(responseJson).length > 0 ? `: ${JSON.stringify(responseJson)}` : ''}`
				);
				return null;
			}

			await sleep(RETRY_BACKOFF_BASE_MS * 2 ** (attempt - 1));
			continue;
		}

		const contentType = response.headers.get('content-type') ?? '';
		const looksLikeJson = contentType.toLowerCase().includes('application/json');

		try {
			if (!looksLikeJson) {
				throw new Error(`Unexpected content-type: ${contentType || 'unknown'}`);
			}

			return (await response.json()) as T;
		} catch (error) {
			const responseJson = await response
				.clone()
				.json()
				.catch(() => ({}));
			const shouldRetry = attempt < MAX_RETRY_ATTEMPTS;

			if (!shouldRetry) {
				console.error(
					`${requestLabel} returned invalid JSON after ${MAX_RETRY_ATTEMPTS} attempts.${Object.keys(responseJson).length > 0 ? ` Body: ${JSON.stringify(responseJson)}` : ''}`,
					error
				);
				return null;
			}

			await sleep(RETRY_BACKOFF_BASE_MS * 2 ** (attempt - 1));
		}
	}

	return null;
}

export const sbbClient = {
	async getYear(token: string, year: number): Promise<SopreMonthsRequest | null> {
		return requestJsonWithRetry<SopreMonthsRequest>(
			`${BASE_API_ENDPOINT}/tourenplan/months?datumVon=${year}-01-01&months=12&tourdetail=false`,
			{
				method: 'GET',
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching SBB year data'
		);
	},
	async getMonth(token: string, year: number, month: number): Promise<SopreMonthsRequest | null> {
		return requestJsonWithRetry<SopreMonthsRequest>(
			`${BASE_API_ENDPOINT}/tourenplan/months?datumVon=${year}-${month.toString().padStart(2, '0')}-01&months=1&tourdetail=false`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching SBB month data'
		);
	},
	async getTourDetail(token: string, tourId: number): Promise<TourenDetailRequest | null> {
		return requestJsonWithRetry<TourenDetailRequest>(
			`${BASE_DETAIL_API_ENDPOINT}/mitarbeiter/tourendetail?mitarbeiterTourId=${tourId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching SBB tour detail'
		);
	},
	async getZeitkontenPeriod(token: string): Promise<ZeitkontenPeriodResponse | null> {
		return requestJsonWithRetry<ZeitkontenPeriodResponse>(
			`${BASE_ZEITKONTEN_API_ENDPOINT}/zeitkonten/period`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`
				}
			},
			'Error fetching Zeitkonten period data'
		);
	}
};
