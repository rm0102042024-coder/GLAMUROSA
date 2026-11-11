const chatButton = document.getElementById('chat-button');
const closeChat = document.getElementById('close-chat');
const chatWindow = document.getElementById('chat-window');
const sendButton = document.getElementById('send-button');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Abrir y cerrar la ventana del chat
chatButton.addEventListener('click', () => {
    chatWindow.style.display = 'flex';
});

closeChat.addEventListener('click', () => {
    chatWindow.style.display = 'none';
});

// Función para mostrar los mensajes en la pantalla
function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll hacia el último mensaje
}

// Función para enviar el mensaje a n8n y recibir la respuesta de Ollama
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Mostrar el mensaje del cliente y limpiar la caja de texto
    addMessage(text, 'user');
    chatInput.value = '';

    try {
        // Enviar la petición al Webhook de n8n
       const response = await fetch('http://localhost:5678/webhook/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        
        // Extraer la respuesta de la IA (ajusta "data.output" si tu nodo de n8n lo devuelve con otro nombre)
        const botReply = data.output || data.message || data.response || data[0]?.message?.content || "Recibí tu mensaje, procesando...";
        addMessage(botReply, 'bot');

    } catch (error) {
        addMessage('Lo siento, el servidor de IA está desconectado en este momento.', 'bot');
        console.error("Error de conexión:", error);
    }
}

// Enviar al hacer clic en el botón o al presionar la tecla Enter
sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});