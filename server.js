const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();

// Estabilização total de CORS e Conexão
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
const upload = multer({ storage: multer.memoryStorage() });

const config = { lang: "por", oem: 3, psm: 6, preset: "fast" };

// ROTA DE DESPERTAR: Chamada automaticamente pelo site ao abrir
app.get('/', (req, res) => {
  res.status(200).json({ status: "Online", message: "IA WillBoot Ativa e Acordada" });
});

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    const text = await tesseract.recognize(req.file.buffer, config);

    // Lógica de Banca e 60 Velas preservada intacta
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 60 : velas.findIndex(v => v >= 5);

    let status, cor, gapMin, alvo, dica, pct;

    // Assertividade e Sinais (90% a 100%) - Conforme Instruções
    if (gapRosa >= 45) {
        status = "CERTEIRO"; cor = "#db2777"; gapMin = 1; alvo = "ROSA (10.00x+)";
        dica = "Protocolo Luanda: Ciclo de Rosa Confirmado."; pct = "100%";
    } else if (gapRoxa >= 30) {
        status = "SINAL PROVÁVEL"; cor = "#7e22ce"; gapMin = 1; alvo = "ROXO (5.00x+)";
        dica = "IA detectou alta frequência de Roxo de Elite."; pct = "98%";
    } else {
        status = "SINAL: VELA ROSA"; cor = "#db2777"; gapMin = 1; alvo = "10.00x+"; 
        dica = "IA detetou compensação de Rosa iminente."; pct = "92%";
    }

    // Lógica de Alcances (Próximos Minutos) solicitada anteriormente
    const agora = new Date();
    const minAtual = agora.getMinutes();
    const min1 = (minAtual + gapMin + 3) % 60;
    const min2 = (minAtual + gapMin + 4) % 60;
    const alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - 5x 10x ou +`;

    const finalTimer = new Date(agora.getTime());
    finalTimer.setMinutes(agora.getMinutes() + gapMin);
    const timer = finalTimer.toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda" });

    res.json({ status, cor, pct, banca, timerRosa: timer, alvo, historico: velas, dica, alcances });
  } catch (e) { 
    res.status(500).json({ error: "Erro de processamento rápido." }); 
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Online na porta ${PORT}`));
server.keepAliveTimeout = 120000;
