const express = require('express');
const cors = require('cors');
const client = require('./database');
const bcrypt = require('bcrypt');
require('dotenv').config();


const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());
// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// === CRIAR TABELAS (rodar só uma vez) ===
async function createTables() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id),
      content TEXT,
      role VARCHAR(10),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

createTables();

// === ROTAS ===

// Registro
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );
    
    res.status(201).json({ message: 'Usuário criado com sucesso', userId: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Username já existe' });
    } else {
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  try {
    const result = await client.query(
      'SELECT id, password FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    res.json({ message: 'Login bem sucedido', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Erro no login' });
  }
});

// Criar conversa
app.post('/conversations', async (req, res) => {
  const { userId, title } = req.body;

  try {
    const result = await client.query(
      'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id',
      [userId, title || 'Nova conversa']
    );
    
    res.json({ conversationId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conversa' });
  }
});

// Chat
app.post('/chat', async (req, res) => {
  const { message, userId, conversationId } = req.body;

  try {
    // Salvar mensagem do usuário
    await client.query(
      'INSERT INTO messages (conversation_id, content, role) VALUES ($1, $2, $3)',
      [conversationId, message, 'user']
    );

    // Chamar OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3.1:free',
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Resposta inesperada da OpenRouter:', data);
      return res.status(500).json({ error: 'Resposta inesperada da OpenRouter', details: data });
    }
    const botReply = data.choices[0].message.content;

    // Salvar resposta do bot
    await client.query(
      'INSERT INTO messages (conversation_id, content, role) VALUES ($1, $2, $3)',
      [conversationId, botReply, 'assistant']
    );

    res.json({ reply: botReply });
  } catch (error) {
    console.error('Erro no endpoint /chat:', error);
    res.status(500).json({ error: 'Erro no chat', details: error.message });
  }
});

// Buscar mensagens
app.get('/messages/:conversationId', async (req, res) => {
  const { conversationId } = req.params;

  try {
    const result = await client.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at',
      [conversationId]
    );
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});