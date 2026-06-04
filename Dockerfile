# Usa a imagem oficial do Node.js estável
FROM node:18

# Instala o motor do Tesseract OCR e os dados do idioma português (por)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-por \
    && rm -rf /var/lib/apt/lists/*

# Cria e define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências do npm
RUN npm install

# Copia o restante do código do projeto (incluindo o seu server.js)
COPY . .

# Expõe a porta que o seu servidor vai usar
EXPOSE 3000

# Comando para iniciar o seu servidor back-end
CMD ["node", "server.js"]
