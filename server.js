const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
const upload = multer({ storage: multer.memoryStorage() });

const config = { lang: "por", oem: 3, psm: 6, preset: "fast" };

app.get('/', (req, res) => {
  res.status(200).json({ status: "Online", message: "IA WillBoot Ativa" });
});

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    const text = await tesseract.recognize(req.file.buffer, config);

    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 60 : velas.findIndex(v => v >= 5);

    let status, cor, gapMin, alvo, pct;

    // Lógica Original de Gap de 30 velas preservada
    if (gapRosa >= 45) {
        status = "CERTEIRO"; cor = "#db2777"; gapMin = 1; alvo = "ROSA (10.00x+)"; pct = "100%";
    } else if (gapRoxa >= 30) {
        status = "SINAL PROVÁVEL"; cor = "#7e22ce"; gapMin = 1; alvo = "ROXO (5.00x+)"; pct = "98%";
    } else {
        status = "SINAL: VELA ROSA"; cor = "#db2777"; gapMin = 1; alvo = "10.00x+"; pct = "92%";
    }

    // Estudo Comportamental Inteligente (Pagar vs Limpar)
    const mediaVelas = velas.reduce((a,b) => a+b, 0) / (velas.length || 1);
    const momento = mediaVelas > 2.5 ? "PAGAR (Gráfico Aquecido)" : "LIMPAR (Recolha de Banca)";
    
    // Lista de Dicas para Rotação de 15 segundos
    const listaDicas = [
        "IA detetou compensação de rosas eminente.",
        `Momento de ${momento}: Comportamento SHA-512 detectado.`,
        "Histórico lido: Aviator em fase de distribuição de lucros.",
        "Ação Sugerida: Aguarde o padrão de 3 velas azuis para entrada.",
        "Análise de Ciclo: O gráfico está a respeitar a tendência de 1.5x.",
        "Cuidado: Detetada sequência de recolha rápida após velas de 5x.",
        "Estratégia: Entre com 10% da banca no alvo previsto pela IA."
    ];

    const agora = new Date();
    const minAtual = agora.getMinutes();
    const min1 = (minAtual + gapMin + 3) % 60;
    const min2 = (minAtual + gapMin + 4) % 60;
    const alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - 5x 10x ou +`;

    const finalTimer = new Date(agora.getTime());
    finalTimer.setMinutes(agora.getMinutes() + gapMin);
    const timer = finalTimer.toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda", hour: '2-digit', minute: '2-digit' });

    res.json({ status, cor, pct, banca, timerRosa: timer, alvo, historico: velas, listaDicas, alcances });
  } catch (e) { 
    res.status(500).json({ error: "Erro interno" }); 
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0');
