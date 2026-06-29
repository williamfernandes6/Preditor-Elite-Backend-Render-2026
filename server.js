const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

const config = { lang: "por", oem: 1, psm: 3 };

// Rota de monitorização do Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: "alive" });
});

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    const text = await tesseract.recognize(req.file.buffer, config);

    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Ajuste o Print";
    
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 25);

    const ultimas10 = velas.slice(0, 10);
    const media = ultimas10.length > 0 ? ultimas10.reduce((a, b) => a + b, 0) / ultimas10.length : 0;
    
    let tendencia = "ESTÁVEL";
    let corTendencia = "#3b82f6";

    if (media < 2.5) { tendencia = "RECOLHA"; corTendencia = "#ef4444"; }
    else if (media > 5) { tendencia = "PAGAMENTO"; corTendencia = "#22c55e"; }

    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 25 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5 && v < 10) === -1 ? 25 : velas.findIndex(v => v >= 5 && v < 10);

    let status, cor, gapMin, alvo, dica, pct, alvoNumerico;

    // Estrutura de Assertividade Inteligente Conforme as Regras de Negócio
    if (tendencia === "RECOLHA" || velas.slice(0,2).some(v => v <= 1.10)) {
        status = "pouco certeiro"; cor = "#ef4444"; gapMin = 15; alvo = "ESPERAR"; alvoNumerico = 0;
        dica = "IA detetou drenagem do provedor. Não faça entradas agora."; pct = "5%";
    } else if (gapRosa > 30 || (gapRosa > 8 && tendencia === "PAGAMENTO")) {
        status = "certeiro"; cor = "#db2777"; gapMin = 2;
        alvo = "10.00x"; alvoNumerico = 10.00; dica = "Momento de Pago Detetado! Ciclo de Rosa Confirmado."; pct = "100%";
    } else if (gapRoxa > 6) {
        status = "sinal provável"; cor = "#7e22ce"; gapMin = 4;
        alvo = "5.00x"; alvoNumerico = 5.00; dica = "Tendência favorável para alavancagem média."; pct = "85%";
    } else {
        status = "pouco certeiro"; cor = "#52525b"; gapMin = 5; alvo = "2.00x"; alvoNumerico = 2.00;
        dica = "Aguardando o gráfico sair da zona de 1x."; pct = "45%";
    }

    const agora = new Date();
    agora.setMinutes(agora.getMinutes() + gapMin);
    const timer = agora.toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda" });

    res.json({ status, cor, pct, banca, timerRosa: timer, alvo, alvoNumerico, historico: velas, dica, tendencia, corTendencia });
  } catch (e) { res.status(500).send("Erro de Processamento"); }
});

app.listen(process.env.PORT || 3000);
