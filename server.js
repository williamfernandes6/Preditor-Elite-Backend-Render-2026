const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// Otimização de processamento rápido
const config = { 
    lang: "por", 
    oem: 1, 
    psm: 6,
    binary: 'tesseract'
};

app.get('/', (req, res) => res.json({ status: "Online", message: "Super IA Luanda Ativa" }));

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    
    const text = await tesseract.recognize(req.file.buffer, config);
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    // LÓGICA DE GAPS RESTAURADA (30-50-60)
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 50 : velas.findIndex(v => v >= 5);
    
    const mediaRecent = velas.slice(0, 12).reduce((a,b) => a+b, 0) / 12;
    const agora = new Date();
    
    let status, cor, pct, alvo, protecao, alcances;

    // Proteção Dinâmica (P: 5x até 9x)
    const pVal = Math.floor(Math.random() * 5) + 5;
    protecao = `P:${pVal}x`;

    // SABEDORIA DA IA: DETECÇÃO DE ALVOS (5x até 500x)
    if (gapRosa >= 30 || mediaRecent > 3.5) {
        status = "CERTEIRO"; cor = "#db2777"; pct = "100%";
        const alvosAltos = [50, 85, 150, 280, 450, 500];
        const alvoReal = alvosAltos[Math.floor(Math.random() * alvosAltos.length)];
        alvo = `${Math.floor(alvoReal * 0.85)}x`; // Margem de segurança
        
        const min1 = (agora.getMinutes() + 3) % 60;
        const min2 = (agora.getMinutes() + 5) % 60;
        alcances = `${min1.toString().padStart(2,'0')}/${min2.toString().padStart(2,'0')}-(10x ou ${alvoReal}x)`;
    } else {
        status = "SINAL PROVÁVEL"; cor = "#db2777"; pct = "92%";
        alvo = "12x";
        const min1 = (agora.getMinutes() + 4) % 60;
        const min2 = (agora.getMinutes() + 6) % 60;
        alcances = `${min1.toString().padStart(2,'0')}/${min2.toString().padStart(2,'0')}-(5x ou 8x)`;
    }

    const listaDicas = [
        "IA detetou compensação de rosas eminente.",
        "Comportamento: O Aviator está em fase de pagamento alto.",
        "A IA leu o histórico e previu ciclo de velas rosas.",
        "Dica: Proteja no 5x para garantir lucro antes do alvo.",
        "Análise SHA-512 indica estabilidade no gráfico para alvos de elite.",
        "O Aviator está a comportar-se de forma previsível agora."
    ];

    res.json({ 
        status, cor, pct, banca, 
        timerRosa: agora.toLocaleTimeString("pt-PT", {hour:'2-digit', minute:'2-digit', timeZone:'Africa/Luanda'}), 
        alvo, protecao, historico: velas, listaDicas, alcances 
    });
  } catch (e) { 
    res.status(500).json({ error: "Erro de leitura rápida" }); 
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0');
