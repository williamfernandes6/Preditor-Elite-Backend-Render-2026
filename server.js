const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();

// CORS Liberado para frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

const upload = multer({ storage: multer.memoryStorage() });
const config = { lang: "por", oem: 1, psm: 6 };

app.get('/health', (req, res) => {
  res.status(200).json({ status: "Online", engine: "Super IA Luanda Elite" });
});

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    const text = await tesseract.recognize(req.file.buffer, config);

    const bancaMatch = text.match(/(?:menu|≡|…|chat)?\s?([\d\.,\s]+)\s?AOA/i) || text.match(/(?:AOA|AO|Kz|KZ)\s?([\d\.,\s]+)/i);
    const banca = bancaMatch ? `${bancaMatch[1].trim()} AOA` : "0,00 AOA";
    
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const ultimas10 = velas.slice(0, 10);
    const media = ultimas10.length > 0 ? ultimas10.reduce((a, b) => a + (b || 0), 0) / 10 : 0;
    
    let status, cor, pct, alvo, protecao, alcances, dica, tendencia, corTendencia;
    const agora = new Date();
    
    const pVal = Math.floor(Math.random() * 5) + 5;
    protecao = `P:${pVal}x`;

    const formatarHora = (minAdd) => {
        const d = new Date(agora.getTime() + minAdd * 60000);
        return d.toLocaleTimeString("pt-PT", { hour: '2-digit', minute: '2-digit', timeZone: "Africa/Luanda" });
    };

    if (gapRosa >= 30 && media > 2.8) {
        status = "CERTEIRO"; cor = "#db2777"; pct = "100%";
        tendencia = "PAGAMENTO"; corTendencia = "#22c55e";
        const alvosElite = [10, 50, 100, 250];
        const alvoReal = alvosElite[Math.floor(Math.random() * alvosElite.length)];
        alvo = alvoReal >= 10 ? `${alvoReal}x+` : `${alvoReal}x`; 
        dica = "IA detetou ciclo de Rosa Confirmado! Momento de Pago.";
        alcances = `${formatarHora(2)} (5x) | ${formatarHora(4)} (8x) | ${formatarHora(7)} (10x+)`;
    } else if (gapRosa > 15) {
        status = "SINAL PROVÁVEL"; cor = "#7e22ce"; 
        pct = (Math.floor(Math.random() * 20) + 80) + "%"; 
        tendencia = "ESTÁVEL"; corTendencia = "#3b82f6";
        alvo = "5x a 9x";
        dica = "Tendência favorável para alavancagem média.";
        alcances = `${formatarHora(3)} (5x) | ${formatarHora(6)} (7x) | ${formatarHora(9)} (9x)`;
    } else {
        status = "SINAL DE RISCO / POUCO CERTEIRO"; cor = "#ef4444"; 
        pct = (Math.floor(Math.random() * 34) + 45) + "%"; 
        tendencia = "RECOLHA"; corTendencia = "#ef4444";
        alvo = "2.00x";
        dica = "IA detetou recolha. Risco alto de vela baixa.";
        alcances = `${formatarHora(2)} (2x) | ${formatarHora(4)} (3x)`;
    }

    const timerRosa = formatarHora(2); 

    res.json({ status, cor, pct, banca, timerRosa, alvo, protecao, historico: velas, dica, alcances, tendencia, corTendencia });
  } catch (e) { 
    res.status(500).json({ error: "Erro interno no servidor" }); 
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
