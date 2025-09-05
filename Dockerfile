FROM node:18-alpine

# Criar diretório da aplicação



WORKDIR /app

# Copiar os arquivos de dependências
COPY chatbot/backend/package*.json ./backend/

# Instalar dependências
WORKDIR /app/backend
RUN npm install --production

# Copiar o restante do código
COPY chatbot/backend/ /app/backend

# Definir porta
ENV PORT=3000
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start", "--prefix", "/app/backend"]
