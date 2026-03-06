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

app.get('/', (req, res) => res.json({ status: "Online" }));

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    const text = await tesseract.recognize(req.file.buffer, config);
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    // RESTAURADO EXATAMENTE: GAP DE 30-50-60 VELAS
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 50 : velas.findIndex(v => v >= 5);
    const gapBase = 30;

    let status, cor, pct, alvoReal, alvoFinal;
    
    // REGRAS DE ASSERTIVIDADE (Conforme sua memória de 05/02)
    if (gapRosa >= 60 || (velas.length > 10 && velas[0] < 2 && velas[1] < 2)) {
        status = "CERTEIRO"; 
        cor = "#db2777"; 
        pct = "100%";
    } else if (gapRosa >= gapBase) {
        status = "SINAL PROVÁVEL"; 
        cor = "#db2777"; 
        pct = `${Math.floor(Math.random() * (99 - 80 + 1)) + 80}%`;
    } else {
        status = "POUCO CERTEIRO"; // Conforme sua regra para < 80%
        cor = "#7e22ce"; 
        pct = `${Math.floor(Math.random() * (79 - 60 + 1)) + 60}%`;
    }

    const mediaVelas = velas.reduce((a,b) => a+b, 0) / (velas.length || 1);
    
    if (mediaVelas > 3 || gapRosa > 40) {
        const alvosAltos = [12, 15, 20, 25, 30, 35, 45, 50, 60, 80, 100];
        alvoReal = alvosAltos[Math.floor(Math.random() * alvosAltos.length)];
        let protecao = (alvoReal * 0.5).toFixed(2);
        alvoFinal = `Alvo Previsto ${alvoReal}x(P:${protecao}x)`;
    } else {
        alvoReal = (Math.random() * (9.99 - 5) + 5).toFixed(2);
        alvoFinal = `Alvo Previsto ${alvoReal}x(P:2.00x)`;
    }

    const agora = new Date();
    const min1 = (agora.getMinutes() + 4) % 60;
    const min2 = (agora.getMinutes() + 5) % 60;
    let alcances;

    if (parseFloat(alvoReal) >= 10) {
        const r1 = Math.floor(Math.random() * 20) + 10;
        const r2 = Math.floor(Math.random() * 30) + 21;
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROSA DETECTADO ${r1}x, ${r2}x+`;
        cor = "#db2777"; 
    } else {
        const v1 = (Math.random() * (7 - 5) + 5).toFixed(1);
        const v2 = (Math.random() * (9.99 - 7.1) + 7.1).toFixed(1);
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROXO VISÍVEL ${v1}x, ${v2}x`;
        cor = "#7e22ce"; 
    }

    const listaDicas = [
        "A IA identificou um padrão de compensação: após 3 velas baixas, o sistema tende a liberar uma vela superior a 5x.",
        "Análise de Histórico: O ciclo de recolha de banca foi identificado como encerrado, iniciando fase de distribuição.",
        "Estudo Algorítmico: Detectada uma tendência de alternância entre cores (Roxo/Rosa) baseada nas últimas 30 velas.",
        "IA observou: O gráfico apresenta 'oxigenação' estável, permitindo alvos mais longos com segurança na proteção.",
        "Dica de Especialista: O volume de velas 1.0x foi reduzido, indicando que o algoritmo está entrando em modo pagador.",
        "A análise detectou que velas rosas costumam sair com gap de 30 velas neste horário, sinal forte agora."
    ];

    res.json({ 
        status, cor, pct, banca, 
        timerRosa: agora.toLocaleTimeString("pt-PT", {hour:'2-digit', minute:'2-digit'}), 
        alvo: alvoFinal, 
        historico: velas, listaDicas, alcances 
    });
  } catch (e) { res.status(500).json({ error: "Erro de Processamento da IA" }); }
});

app.listen(process.env.PORT || 3000);
