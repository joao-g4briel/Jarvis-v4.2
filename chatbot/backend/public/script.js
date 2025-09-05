const chatDiv = document.getElementById('chat');
const input = document.getElementById('input');

// Detecta ambiente e define a URL base do backend
const backendUrl = (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1')
	? 'http://localhost:3000'
	: 'https://wggks448w0wok8okwo0ww4w0.coolify.dtecchat.qzz.io';

async function loadMessages() {
	const res = await fetch(`${backendUrl}/messages`);
	const messages = await res.json();
	chatDiv.innerHTML = messages.map(m => `<div><strong>${m.role}:</strong> ${m.content}</div>`).join('');
}

async function sendMessage() {
	const message = input.value;
	if (!message) return;

	// Mostrar mensagem do usuário
	chatDiv.innerHTML += `<div><strong>user:</strong> ${message}</div>`;

	const res = await fetch(`${backendUrl}/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message })
	});

	const data = await res.json();

	// Mostrar resposta do bot
	chatDiv.innerHTML += `<div><strong>assistant:</strong> ${data.reply}</div>`;
	input.value = '';
}

loadMessages();
