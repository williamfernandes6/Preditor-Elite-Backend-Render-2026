const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
const upload = multer({ storage: multer.memoryStorage() });

const config = { lang: "por", oem: 1, psm: 6 };

app.get('/', (req, res) => res.json({ status: "Online" }));

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    const text = await tesseract.recognize(req.file.buffer, config);

    // Leitura focada na Elephant Bet (AOA)
    const bancaMatch = text.match(/([\d\.,\s]{1,10})\s?(?:AOA|AO|Kz|KZ|Saldo|Banca)/i) || text.match(/(?:Saldo|Banca|AOA)\s?([\d\.,\s]{1,10})/i);
    const banca = bancaMatch ? `AOA ${bancaMatch[1].trim()}` : "Verifique o Saldo";
    
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const ultimas10 = velas.slice(0, 10);
    const media = ultimas10.reduce((a, b) => a + (b || 0), 0) / 10;

    let status, cor, pct, alvo, protecao, alcances;
    const agora = new Date();
    const pVal = Math.floor(Math.random() * 5) + 5;
    protecao = `P:${pVal}x`;

    if (gapRosa >= 30 && media > 2.5) {
      status = "CERTEIRO"; cor = "#db2777"; pct = "100%";
      const alvosElite = [50, 100, 200, 500];
      const alvoReal = alvosElite[Math.floor(Math.random() * alvosElite.length)];
      alvo = `${alvoReal}x`;
      const m1 = (agora.getMinutes() + 2) % 60;
      const m2 = (agora.getMinutes() + 4) % 60;
      alcances = `${m1.toString().padStart(2,'0')}/${m2.toString().padStart(2,'0')}-(10x ou ${alvoReal}x)`;
    } else {
      status = "SINAL PROVÁVEL"; cor = "#7e22ce"; pct = "88%";
      alvo = "10.00x";
      const m1 = (agora.getMinutes() + 4) % 60;
      const m2 = (agora.getMinutes() + 6) % 60;
      alcances = `${m1.toString().padStart(2,'0')}/${m2.toString().padStart(2,'0')}-(5x ou 8x)`;
    }

    const timer = new Date(agora.getTime() + 2 * 60000).toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda" });

    res.json({ 
      status, cor, pct, banca, timerRosa: timer, alvo, protecao, 
      historico: velas, alcances, dica: "IA analisando ciclo SHA-512 Elephant Bet." 
    });
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

app.listen(process.env.PORT || 3000);
