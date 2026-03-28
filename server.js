const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
const upload = multer({ storage: multer.memoryStorage() });

const config = { lang: "por", oem: 1, psm: 6 };

// Rota para o ponto ficar verde no site
app.get('/', (req, res) => {
  res.status(200).json({ status: "Online" });
});

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    const text = await tesseract.recognize(req.file.buffer, config);

    // Leitura da Banca Elephant Bet (AOA)
    const bancaMatch = text.match(/([\d\.,\s]+)\s?AOA/i) || text.match(/(?:AOA|AO|Kz|KZ)\s?([\d\.,\s]+)/i);
    const banca = bancaMatch ? `${bancaMatch[1].trim()} AOA` : "0,00 AOA";
    
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const ultimas10 = velas.slice(0, 10);
    const media = ultimas10.length > 0 ? ultimas10.reduce((a, b) => a + (b || 0), 0) / 10 : 0;
    
    let status, cor, pct, alvo, protecao, alcances, dica;
    const agora = new Date();
    const pVal = Math.floor(Math.random() * 5) + 5;
    protecao = `P:${pVal}x`;

    if (gapRosa >= 30 && media > 2.8) {
        status = "CERTEIRO"; cor = "#db2777"; pct = "100%";
        const alvosElite = [50, 100, 250, 500];
        const alvoReal = alvosElite[Math.floor(Math.random() * alvosElite.length)];
        alvo = `${alvoReal}x`;
        dica = "Ciclo de Rosa Confirmado! Momento de Pago.";
        const m1 = (agora.getMinutes() + 2) % 60;
        const m2 = (agora.getMinutes() + 4) % 60;
        alcances = `${m1.toString().padStart(2,'0')}/${m2.toString().padStart(2,'0')}-(10x ou ${alvoReal}x)`;
    } else if (gapRosa > 15) {
        status = "SINAL PROVÁVEL"; cor = "#7e22ce"; pct = "88%";
        alvo = "10.00x";
        dica = "Tendência favorável para alavancagem média.";
        const m1 = (agora.getMinutes() + 4) % 60;
        const m2 = (agora.getMinutes() + 6) % 60;
        alcances = `${m1.toString().padStart(2,'0')}/${m2.toString().padStart(2,'0')}-(5x ou 8x)`;
    } else {
        status = "ANALISANDO"; cor = "#52525b"; pct = "45%";
        alvo = "2.00x";
        dica = "IA detetou recolha. Aguardando saída da zona de 1x.";
        alcances = "Aguardando sinal...";
    }

    const timer = new Date(agora.getTime() + 2 * 60000).toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda" });

    res.json({ status, cor, pct, banca, timerRosa: timer, alvo, protecao, historico: velas, dica, alcances });
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

app.listen(process.env.PORT || 3000);
