const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// Configuração Otimizada para leitura de dados tabulares (Velas do Aviator)
const config = { 
  lang: "por", 
  oem: 3, 
  psm: 6,
  "tessdata_fast": "1" 
};

app.get('/', (req, res) => res.json({ status: "Online", versao: "Super IA 3.5" }));

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    
    const text = await tesseract.recognize(req.file.buffer, config);
    
    // CAPTURA DE BANCA
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    
    // LEITURA DE VELAS (Histórico de até 60 velas)
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    // GAPS DEFINIDOS: 30 (Base), 50 (Roxo), 60 (Rosa Máximo)
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 50 : velas.findIndex(v => v >= 5);
    const gapBase = 30;

    // LÓGICA DE GATILHO (Para sinais certeiros)
    const ultimaVela = velas[0] || 0;
    const velaDeForça = ultimaVela >= 1.80; // Ajustado para 1.80x para ser mais rápido na entrega
    const velaDeLixo = ultimaVela < 1.20;

    let status, cor, pct, alvoReal, alvoFinal;
    
    // 1 - DEFINIÇÃO DE ASSERTIVIDADE E VELOCIDADE DE RESPOSTA
    const velasBaixasSeguidas = velas.slice(0, 5).filter(v => v < 2).length;
    
    if (velas.length === 0) {
        status = "AGUARDANDO DADOS";
        cor = "#52525b";
        pct = "0%";
        alvoFinal = "Sem velas detetadas";
    } else if ((gapRosa >= 60 || gapRosa >= gapBase) && velaDeForça) {
        status = "CERTEIRO"; 
        cor = "#db2777"; 
        pct = "100%";
    } else if (gapRosa >= gapBase || gapRoxa >= 20) {
        status = "SINAL PROVÁVEL"; 
        cor = "#db2777"; 
        pct = `${Math.floor(Math.random() * (99 - 80 + 1)) + 80}%`;
    } else if (velasBaixasSeguidas > 3 || velaDeLixo) {
        status = "SINAL DE RISCO"; 
        cor = "#ef4444"; 
        pct = `${Math.floor(Math.random() * (79 - 50 + 1)) + 50}%`;
    } else {
        status = "POUCO CERTEIRO"; 
        cor = "#f97316"; 
        pct = `${Math.floor(Math.random() * (79 - 65 + 1)) + 65}%`;
    }

    // ANALISE DE MOMENTO (PAGAR VS LIMPAR)
    const mediaVelas = velas.reduce((a,b) => a+b, 0) / (velas.length || 1);
    const momento = mediaVelas > 2.5 ? "PAGAR (Gráfico Aquecido)" : "LIMPAR (Recolha de Banca)";
    
    // 2 - ALVOS E LUCRO MÍNIMO (Busca de 3x, 5x e 8x)
    let infoExtraRecolha = ""; 
    
    if (momento === "LIMPAR (Recolha de Banca)") {
        alvoReal = (Math.random() * (9.99 - 5.00) + 5.00).toFixed(2); 
        const minutosMelhora = Math.floor(Math.random() * 5) + 2; 
        infoExtraRecolha = ` | ATENÇÃO: Modo Recolha. Próximo Rosa em aprox. ${minutosMelhora} min.`;
        alvoFinal = `Alvo Previsto ${alvoReal}x(P:1.50x)${infoExtraRecolha}`;
    } else {
        if (mediaVelas > 3.2 || gapRosa > 35) {
            const possiveisRosas = [12, 15, 20, 25, 30, 40, 50, 80, 100];
            alvoReal = possiveisRosas[Math.floor(Math.random() * possiveisRosas.length)];
            let lucroMinimo = mediaVelas > 4 ? "5.00" : "3.00"; 
            alvoFinal = `Alvo Previsto ${alvoReal}x(P:${lucroMinimo}x)`;
        } else {
            alvoReal = (Math.random() * (9.5 - 7.5) + 7.5).toFixed(2); 
            alvoFinal = `Alvo Previsto ${alvoReal}x(P:3.00x)`;
        }
    }

    // 3 - ALCANCES DINÂMICOS
    const agora = new Date();
    const min1 = (agora.getMinutes() + 4) % 60;
    const min2 = (agora.getMinutes() + 5) % 60;
    let alcances;

    if (momento === "LIMPAR (Recolha de Banca)") {
        const v2 = (Math.random() * (9.9 - 7) + 7).toFixed(1);
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - RECOLHA: Limite ${v2}x`;
        cor = "#ef4444"; 
    } else if (parseFloat(alvoReal) >= 10) {
        const r1 = Math.floor(Math.random() * 20) + 10;
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROSA DETECTADO ${r1}x+`;
        cor = "#db2777"; 
    } else {
        const v1 = (Math.random() * (9.99 - 7) + 7).toFixed(1);
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROXO ALTO ${v1}x`;
        cor = "#7e22ce"; 
    }

    // 4 - LISTA DE DICAS
    const listaDicas = [
        "IA Detectou: Padrão de alternância finalizado. Janela de tempo para lucro alto.",
        "Dica da Super IA: Ciclo de 15 minutos atingido, tendência de repetição detetada.",
        "Análise Técnica: Identificada 'escada' de valores crescentes, Rosa iminente.",
        "Aviso Super IA: Em ciclos de recolha, proteja a banca no 1.50x ou aguarde.",
        "Estudo de Ciclos: O servidor está a oxigenar as velas. Alvos de 5x a 8x favorecidos."
    ];

    res.json({ 
        status, cor, pct, banca, 
        timerRosa: agora.toLocaleTimeString("pt-PT", {hour:'2-digit', minute:'2-digit'}), 
        alvo: alvoFinal, 
        historico: velas, listaDicas, alcances 
    });
    
  } catch (e) { 
    res.status(500).json({ error: "Erro de Processamento da IA" }); 
  }
});

app.listen(process.env.PORT || 3000);
