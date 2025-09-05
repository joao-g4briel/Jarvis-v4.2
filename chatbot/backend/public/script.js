const chatDiv = document.getElementById('chat');
const input = document.getElementById('input');

async function loadMessages() {
	const res = await fetch('http://localhost:3000/messages');
	const messages = await res.json();
	chatDiv.innerHTML = messages.map(m => `<div><strong>${m.role}:</strong> ${m.content}</div>`).join('');
}

async function sendMessage() {
	const message = input.value;
	if (!message) return;

	// Mostrar mensagem do usuário
	chatDiv.innerHTML += `<div><strong>user:</strong> ${message}</div>`;

	const res = await fetch('http://localhost:3000/chat', {
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
(placeholder)
