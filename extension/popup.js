document.addEventListener('DOMContentLoaded', async () => {
	const input = document.getElementById('apiKey');
	const saveBtn = document.getElementById('saveBtn');
	const status = document.getElementById('status');

	const stored = await browser.storage.local.get('apiKey');
	if (stored.apiKey) {
		input.value = stored.apiKey;
	}

	saveBtn.addEventListener('click', async () => {
		const key = input.value.trim();

		await browser.storage.local.set({ apiKey: key });

		status.textContent = 'API Key saved successfully!';
		setTimeout(() => {
			status.textContent = '';
		}, 2000);
	});
});
