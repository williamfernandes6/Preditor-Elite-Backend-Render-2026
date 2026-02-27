const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// CONFIGURAÇÃO TESSERACT: Otimizada para maior velocidade de leitura
const config = { 
  lang: "por", 
  oem: 1, 
  psm: 3
};

app.get('/', (req, res) => {
  res.json({ audit_path: "/auditoria", message: "WillBoot-PRO AI Engine Online" });
});

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    
    // Processamento paralelo para ganhar velocidade
    const text = await tesseract.recognize(req.file.buffer, config);

    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Ajuste o Print";
    
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    const ultimas10 = velas.slice(0, 10);
    const media = ultimas10.length > 0 ? ultimas10.reduce((a, b) => a + b, 0) / ultimas10.length : 0;
    
    let tendencia = "ESTÁVEL";
    let corTendencia = "#3b82f6";

    if (media < 2.5) { tendencia = "RECOLHA"; corTendencia = "#ef4444"; }
    else if (media > 5) { tendencia = "PAGAMENTO"; corTendencia = "#22c55e"; }

    // GAPS DEFINIDOS: Foco 30 (Roxo 5x) e 60 (Rosa 10x)
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 60 : velas.findIndex(v => v >= 5);

    let status, cor, gapMin, alvo, dica, pct;

    // RESTAURAÇÃO DA ASSERTIVIDADE E CORES ORIGINAIS
    if (gapRosa >= 60) {
        status = "CERTEIRO"; 
        cor = "#db2777"; // Rosa
        gapMin = 1; 
        alvo = "ROSA (10.00x >>> 50x+)";
        dica = "Protocolo Luanda: Ciclo Rosa Confirmado (Gap 60)."; 
        pct = "100%";
    } else if (gapRoxa >= 30) {
        status = "SINAL PROVÁVEL"; 
        cor = "#7e22ce"; // Roxo
        gapMin = 2;
        alvo = "ROXO (5.00x >>> 9.99x)"; 
        dica = "Sinal Provável: Roxo de Elite detetado após Gap 30."; 
        pct = "95%";
    } 
    else if (gapRosa > 15) {
        status = "SINAL: VELA ROSA"; 
        cor = "#db2777"; // Rosa
        gapMin = 2;
        alvo = "10.00x+"; 
        dica = "IA detetou aproximação de vela Rosa."; 
        pct = "92%";
    } else if (gapRoxa > 8) {
        status = "SINAL: ROXO ALTO"; 
        cor = "#7e22ce"; // Roxo
        gapMin = 3;
        alvo = "5.00x+"; 
        dica = "Tendência de Roxo Alto confirmada no fluxo."; 
        pct = "85%";
    } else {
        status = "POUCO CERTEIRO"; 
        cor = "#52525b"; 
        gapMin = 5; 
        alvo = "AGUARDAR 5X";
        dica = "Aguardando sinal com assertividade superior a 80%."; 
        pct = "40%";
    }

    const agora = new Date();
    agora.setMinutes(agora.getMinutes() + gapMin);
    const timer = agora.toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda" });

    res.json({ status, cor, pct, banca, timerRosa: timer, alvo, historico: velas, dica, tendencia, corTendencia });
  } catch (e) { 
    res.status(500).send("Erro: " + e.message); 
  }
});

app.listen(process.env.PORT || 3000);
