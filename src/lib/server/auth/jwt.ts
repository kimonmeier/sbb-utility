export const getJwtExpMs = (rawToken: string): number | null => {
	const token = rawToken.replace(/^Bearer\s+/i, '').trim();
	const parts = token.split('.');

	if (parts.length !== 3) {
		return null;
	}

	const payload = parts[1];
	const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

	try {
		const decoded = Buffer.from(padded, 'base64').toString('utf-8');
		const parsed = JSON.parse(decoded) as { exp?: number };

		if (typeof parsed.exp !== 'number' || !Number.isFinite(parsed.exp)) {
			return null;
		}

		return parsed.exp * 1000;
	} catch {
		return null;
	}
};
