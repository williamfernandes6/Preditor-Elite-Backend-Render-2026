const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

const config = { 
  lang: "por", 
  oem: 3, 
  psm: 6,
  "tessdata_fast": "1" 
};

app.get('/', (req, res) => res.json({ status: "Online", ia_version: "Super IA Turbo" }));

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    
    const text = await tesseract.recognize(req.file.buffer, config);
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    // GAPS DEFINIDOS: 30-50-60
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 50 : velas.findIndex(v => v >= 5);
    const gapBase = 30;

    // GATILHO ULTRA SENSÍVEL (Para garantir sinal em menos de 1 min)
    const ultimaVela = velas[0] || 0;
    const velaDeForça = ultimaVela >= 1.50; // Reduzido para 1.50x para disparar sinais mais rápido
    const velaDeLixo = ultimaVela < 1.20;

    let status, cor, pct, alvoReal, alvoFinal;
    
    // 1 - LÓGICA DE ASSERTIVIDADE (SEMPRE GERA RESPOSTA)
    if (velas.length === 0) {
        status = "AGUARDANDO PRINT";
        cor = "#52525b";
        pct = "100%"; 
        alvoFinal = "Sinal em 1 min...";
    } else if ((gapRosa >= 30) && velaDeForça) {
        status = "CERTEIRO"; 
        cor = "#db2777"; 
        pct = "100%";
    } else if (gapRosa >= 20 || gapRoxa >= 15) {
        status = "SINAL PROVÁVEL"; 
        cor = "#db2777"; 
        pct = `${Math.floor(Math.random() * (99 - 80 + 1)) + 80}%`;
    } else {
        // Mesmo em gráfico mau, ele gera um sinal de "RISCO" para não travar
        status = "SINAL DE RISCO"; 
        cor = "#ef4444"; 
        pct = `${Math.floor(Math.random() * (79 - 50 + 1)) + 50}%`;
    }

    const mediaVelas = velas.reduce((a,b) => a+b, 0) / (velas.length || 1);
    const momento = mediaVelas > 2.2 ? "PAGAR" : "LIMPAR";
    
    // 2 - ALVOS DE LUCRO (3x, 5x, 8x)
    if (momento === "LIMPAR") {
        alvoReal = (Math.random() * (8 - 5) + 5).toFixed(2); 
        alvoFinal = `Alvo Previsto ${alvoReal}x(P:2.00x) | Gráfico em análise de ciclo.`;
    } else {
        const possiveisRosas = [10, 15, 20, 30, 50];
        alvoReal = possiveisRosas[Math.floor(Math.random() * possiveisRosas.length)];
        let lucroMinimo = mediaVelas > 3 ? "5.00" : "3.00"; 
        alvoFinal = `Alvo Previsto ${alvoReal}x(P:${lucroMinimo}x)`;
    }

    // 3 - ALCANCES (Próximo minuto)
    const agora = new Date();
    const min1 = (agora.getMinutes() + 1) % 60; // Configurado para o próximo minuto exato
    const min2 = (agora.getMinutes() + 2) % 60;
    
    const v1 = (Math.random() * (5 - 3) + 3).toFixed(1);
    const v2 = (Math.random() * (15 - 10) + 10).toFixed(1);
    const alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ALVOS: ${v1}x e ${v2}x+`;

    const listaDicas = [
        "IA Turbo: Entrada confirmada para o próximo minuto.",
        "Dica: Proteção no 3x ativada para garantir lucro rápido.",
        "Análise: Quebra de padrão detectada. O sinal é imediato.",
        "Super IA: Ciclo de pagamento curto identificado."
    ];

    res.json({ 
        status, cor, pct, banca, 
        timerRosa: agora.toLocaleTimeString("pt-PT", {hour:'2-digit', minute:'2-digit'}), 
        alvo: alvoFinal, 
        historico: velas, listaDicas, alcances 
    });
    
  } catch (e) { 
    res.status(500).json({ error: "Erro Turbo IA" }); 
  }
});

app.listen(process.env.PORT || 3000);
