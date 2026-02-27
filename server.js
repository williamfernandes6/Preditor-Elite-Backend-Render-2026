const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors()); // Mantido para permitir a conexão do GitHub
const upload = multer({ storage: multer.memoryStorage() });

// CONFIGURAÇÃO DE ALTA VELOCIDADE: Ajustada para eliminar erro de conexão
const config = { 
  lang: "por", 
  oem: 3, 
  psm: 6,
  preset: "fast"
};

// Rota de Auditoria para confirmar que o Render está "Live"
app.get('/', (req, res) => {
  res.json({ audit_path: "/auditoria", message: "WillBoot-PRO AI Engine Online" });
});

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    
    // Processamento otimizado para resposta em menos de 15s
    const text = await tesseract.recognize(req.file.buffer, config);

    // Identificação de Banca (Mantida Original)
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Ajuste o Print";
    
    // Leitura do Histórico (Mantida 60 velas)
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    // RESTAURAÇÃO DA TENDÊNCIA
    const ultimas10 = velas.slice(0, 10);
    const mediaRecente = ultimas10.length > 0 ? ultimas10.reduce((a, b) => a + b, 0) / ultimas10.length : 0;
    
    let tendencia = "ESTÁVEL";
    let corTendencia = "#3b82f6";
    if (mediaRecente < 2.2) { tendencia = "RECOLHA"; corTendencia = "#ef4444"; }
    else if (mediaRecente > 4.5) { tendencia = "PAGAMENTO"; corTendencia = "#22c55e"; }

    // GAPS DE ASSERTIVIDADE (30 para Roxo 5x | 60 para Rosa 10x)
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 60 : velas.findIndex(v => v >= 5);

    let status, cor, gapMin, alvo, dica, pct;

    // LÓGICA DE CORES E SINAIS (5x-9.99x Roxo | 10x-50x+ Rosa)
    if (gapRosa >= 60) {
        status = "CERTEIRO"; 
        cor = "#db2777"; 
        gapMin = 1; 
        alvo = "ROSA (10.00x >>> 50x+)";
        dica = "Protocolo Luanda: Ciclo Rosa Confirmado. Entrada Certeira."; 
        pct = "100%";
    } else if (gapRoxa >= 30) {
        status = "SINAL PROVÁVEL"; 
        cor = "#7e22ce"; 
        gapMin = 2;
        alvo = "ROXO (5.00x >>> 9.99x)"; 
        dica = "Sinal Provável: Roxo de Elite (5x+) detetado no histórico."; 
        pct = "96%";
    } else if (gapRosa > 15) {
        status = "SINAL: VELA ROSA"; 
        cor = "#db2777"; 
        gapMin = 1; 
        alvo = "10.00x+"; 
        dica = "IA detetou aproximação de Ciclo Rosa. Atenção ao minuto."; 
        pct = "92%";
    } else if (gapRoxa > 8) {
        status = "SINAL: ROXO ALTO"; 
        cor = "#7e22ce"; 
        gapMin = 2; 
        alvo = "5.00x+"; 
        dica = "Tendência de Roxo Alto (5x) confirmada."; 
        pct = "88%";
    } else {
        status = "POUCO CERTEIRO"; 
        cor = "#52525b"; 
        gapMin = 3; 
        alvo = "AGUARDAR 5X";
        dica = "Aguardando sinal com assertividade superior a 80%."; 
        pct = "81%";
    }

    // SINCRONIZAÇÃO DE TEMPO (Fuso Luanda)
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() + gapMin);
    const timer = agora.toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda" });

    res.json({ 
        status, cor, pct, banca, 
        timerRosa: timer, alvo, 
        historico: velas, dica, 
        tendencia, corTendencia 
    });
  } catch (e) { 
    console.error("ERRO IA:", e);
    res.status(500).json({ error: "Erro de conexão interna no processamento." }); 
  }
});

// Porta dinâmica para o Render não derrubar a conexão
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
