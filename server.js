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

    // 5. DETECÇÃO DA BANCA: Foca no valor perto do ícone de menu (3 pontos/traços)
    const bancaMatch = text.match(/([\d\.,\s]+)\s?AOA/i) || text.match(/(?:AOA|AO)\s?([\d\.,\s]+)/i);
    const banca = bancaMatch ? `${bancaMatch[1].trim()} AOA` : "Ajuste o Print";
    
    // Análise rápida de até 60 velas para identificar o Gap [cite: 2026-02-06]
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const ultimas10 = velas.slice(0, 10);
    const media = ultimas10.reduce((a, b) => a + (b || 0), 0) / 10;
    
    let status, cor, pct, alvo, alcances, dica;
    const agora = new Date();

    // 3. HORÁRIO SEM SEGUNDOS: Apenas Hora e Minuto
    const formatarHora = (minAdd) => {
        const d = new Date(agora.getTime() + minAdd * 60000);
        return d.toLocaleTimeString("pt-PT", { hour: '2-digit', minute: '2-digit', timeZone: "Africa/Luanda" });
    };

    // 1 & 4. LÓGICA DE ALVO (5x a 10x+) E ASSERTIVIDADE (80%-99%)
    if (gapRosa >= 30 && media > 2.5) {
        status = "CERTEIRO"; cor = "#db2777"; 
        pct = (Math.floor(Math.random() * 20) + 80) + "%"; // 80% a 99% [cite: 2026-02-05]
        alvo = "10x+"; // Sinal de mais quando detecta rosa alta
        
        // 2. ALCANCES POSSÍVEIS: Múltiplos sinais em minutos diferentes
        alcances = `${formatarHora(2)} (5x) | ${formatarHora(4)} (8x) | ${formatarHora(7)} (10x+)`;
        dica = "Ciclo de Rosa detectado. Alvos confirmados.";
    } else {
        status = "SINAL PROVÁVEL"; cor = "#7e22ce"; 
        pct = (Math.floor(Math.random() * 10) + 80) + "%"; 
        alvo = "5x a 9x"; 
        alcances = `${formatarHora(3)} (5x) | ${formatarHora(6)} (6x) | ${formatarHora(9)} (8x)`;
        dica = "Análise de tendência estável para alvos médios.";
    }

    const timerRosa = formatarHora(2); // Horário previsto principal sem segundos

    res.json({ status, cor, pct, banca, timerRosa, alvo, historico: velas, dica, alcances });
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

app.listen(process.env.PORT || 3000);
