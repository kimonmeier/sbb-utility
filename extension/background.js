// Monitor both specific URLs
const TARGET_URLS = [
	'https://tip2.sbb.ch/rest/mitarbeiter/*',
	'https://sopreweb-tourenplan-api.app.sbb.ch/mitarbeiter/check*'
];
const RECEIVER_ENDPOINT = 'https://sbb.k-meier.ch/api/token';

console.log(
	'SBB Utility Extension Loaded. Listening for outgoing requests to extract Bearer tokens...'
);

browser.webRequest.onBeforeSendHeaders.addListener(
	(details) => {
		console.log('Intercepted request to:', details.url);
		for (let header of details.requestHeaders) {
			if (header.name.toLowerCase() === 'authorization') {
				const authValue = header.value;
				if (authValue.toLowerCase().startsWith('bearer ')) {
					const token = authValue.substring(7);
					processToken(token);
					break;
				}
			}
		}
		return { requestHeaders: details.requestHeaders };
	},
	{ urls: TARGET_URLS },
	['requestHeaders']
);

function isTokenExpired(token) {
	if (!token) return true;
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return true;

		let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const pad = base64.length % 4;
		if (pad) {
			base64 += new Array(5 - pad).join('=');
		}

		const payloadStr = atob(base64);
		const payload = JSON.parse(payloadStr);

		if (!payload.exp) return true;

		const currentTimeSeconds = Math.floor(Date.now() / 1000);
		return payload.exp < currentTimeSeconds;
	} catch (error) {
		console.error('Error checking token expiration:', error.message || error);
		return true;
	}
}

async function processToken(newToken) {
	try {
		if (!newToken) return;

		// Retrieve BOTH the last token and the API key from storage
		const stored = await browser.storage.local.get(['lastToken', 'apiKey']);
		const lastToken = stored.lastToken;
		const apiKey = stored.apiKey;

		// If the user hasn't set an API key yet, abort.
		if (!apiKey) {
			console.warn('API key not set. Please configure it in the extension popup.');
			return;
		}

		if (!lastToken || isTokenExpired(lastToken)) {
			console.log('Saved token is missing or expired. Sending new token to server...');

			const response = await fetch(RECEIVER_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// Pass the API key to your server here.
					// Adjust the header name ('x-api-key') to match what your server expects!
					Authorization: `Bearer ${apiKey}`
				},
				body: JSON.stringify({
					token: newToken
				})
			});

			if (response.ok) {
				await browser.storage.local.set({ lastToken: newToken });
				console.log('New token successfully sent and saved locally.');
			} else {
				console.error('Server rejected the token update. Status:', response.status);
			}
		}
	} catch (error) {
		console.error('Error processing token:', error);
	}
}
