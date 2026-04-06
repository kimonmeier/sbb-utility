const RECEIVER_ENDPOINT = 'https://sbb.k-meier.ch/api/token';

browser.webRequest.onBeforeSendHeaders.addListener(
	(details) => {
		// 1. Check if the URL contains our target domains
		if (
			details.url.includes('tip2.sbb.ch') ||
			details.url.includes('sopreweb-tourenplan-api.app.sbb.ch')
		) {
			console.log('🌍 Intercepted request to target domain:', details.url);

			let foundAuthHeader = false;

			// 2. Scan the headers
			for (let header of details.requestHeaders) {
				if (header.name.toLowerCase() === 'authorization') {
					foundAuthHeader = true;
					console.log('🔑 Found Authorization header!');

					const authValue = header.value;
					if (authValue.toLowerCase().startsWith('bearer ')) {
						const token = authValue.substring(7);
						console.log('✅ Bearer token extracted successfully.');
						processToken(token);
						break;
					} else {
						console.log(
							'❌ Authorization header found, but it is NOT a Bearer token. Value:',
							authValue.substring(0, 20) + '...'
						);
					}
				}
			}

			if (!foundAuthHeader) {
				console.log('⚠️ No Authorization header found on this request.');
			}
		}
		return { requestHeaders: details.requestHeaders };
	},
	{ urls: ['<all_urls>'] }, // Listen to everything, filter inside
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
		return true;
	}
}

async function processToken(newToken) {
	try {
		if (!newToken) return;

		const stored = await browser.storage.local.get(['lastToken', 'apiKey']);
		const lastToken = stored.lastToken;
		const apiKey = stored.apiKey;

		if (!apiKey) {
			console.warn('🛑 API key not set! Open the extension popup and save your key.');
			return;
		}

		if (!lastToken || isTokenExpired(lastToken)) {
			console.log('🔄 Saved token is missing or expired. Sending new token to external API...');

			const response = await fetch(RECEIVER_ENDPOINT, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey
				},
				body: JSON.stringify({ token: newToken })
			});

			if (response.ok) {
				await browser.storage.local.set({ lastToken: newToken });
				console.log('🎉 Token successfully sent and saved locally!');
			} else {
				console.error('💥 Server rejected the token update. Status:', response.status);
			}
		} else {
			console.log('⏸️ Token is already saved and has not expired yet. Skipping send.');
		}
	} catch (error) {
		console.error('💥 Error processing token:', error);
	}
}
