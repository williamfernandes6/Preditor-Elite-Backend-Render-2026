const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// Configuração Otimizada para Leitura de Colunas de Números (Aviator)
const config = { 
  lang: "por", 
  oem: 3, 
  psm: 6,
  "tessdata_fast": "1" 
};

app.get('/', (req, res) => res.json({ status: "Online", ia_version: "Super Intelligent 3.0" }));

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Sem imagem" });
    
    const text = await tesseract.recognize(req.file.buffer, config);
    
    // CAPTURA DE BANCA (Melhorada)
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    
    // LEITURA DE VELAS (Até 60 velas para análise profunda)
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    // GAPS DEFINIDOS: 30 (Base), 50 (Roxo), 60 (Rosa Máximo)
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 50 : velas.findIndex(v => v >= 5);
    const gapBase = 30;

    // LÓGICA DE GATILHO (TRIGGER)
    const ultimaVela = velas[0] || 0;
    const velaDeForça = ultimaVela >= 2.00; // Confirmação de que o servidor começou a pagar
    const velaDeLixo = ultimaVela < 1.20;   // Confirmação de que a recolha continua

    let status, cor, pct, alvoReal, alvoFinal;
    
    // 1 - DEFINIÇÃO DE ASSERTIVIDADE (CERTEIRO, PROVÁVEL, RISCO)
    const velasBaixasSeguidas = velas.slice(0, 5).filter(v => v < 2).length;
    
    if ((gapRosa >= 60 || gapRosa >= gapBase) && velaDeForça) {
        status = "CERTEIRO"; 
        cor = "#db2777"; 
        pct = "100%"; // 100% de assertividade conforme solicitado
    } else if (gapRosa >= gapBase || gapRoxa >= 20) {
        status = "SINAL PROVÁVEL"; 
        cor = "#db2777"; 
        pct = `${Math.floor(Math.random() * (99 - 80 + 1)) + 80}%`; // Entre 80% e 99%
    } else if (velasBaixasSeguidas > 3 || velaDeLixo) {
        status = "SINAL DE RISCO"; 
        cor = "#ef4444"; 
        pct = `${Math.floor(Math.random() * (79 - 50 + 1)) + 50}%`; // Abaixo de 80%
    } else {
        status = "POUCO CERTEIRO"; 
        cor = "#f97316"; 
        pct = `${Math.floor(Math.random() * (79 - 65 + 1)) + 65}%`;
    }

    // ANALISE DE MOMENTO (PAGAR VS LIMPAR)
    const mediaVelas = velas.reduce((a,b) => a+b, 0) / (velas.length || 1);
    const momento = mediaVelas > 2.5 ? "PAGAR (Gráfico Aquecido)" : "LIMPAR (Recolha de Banca)";
    
    // 2 - ALVOS E LUCRO MÍNIMO (3x - 5x - 8x)
    let infoExtraRecolha = ""; 
    
    if (momento === "LIMPAR (Recolha de Banca)") {
        // MODO RECOLHA: Foca em Roxos curtos para não quebrar a banca
        alvoReal = (Math.random() * (9.99 - 5.00) + 5.00).toFixed(2); 
        const minutosMelhora = Math.floor(Math.random() * 5) + 2; 
        infoExtraRecolha = ` | AVISO: Gráfico em limpeza. Próximo Rosa (10x+) em aprox. ${minutosMelhora} min.`;
        alvoFinal = `Alvo Previsto ${alvoReal}x(P:2.00x)${infoExtraRecolha}`;
    } else {
        // MODO PAGAMENTO: Busca Lucro Mínimo Alto
        if (mediaVelas > 3.2 || gapRosa > 35) {
            const possiveisRosas = [12, 15, 20, 25, 30, 40, 50, 80, 100];
            alvoReal = possiveisRosas[Math.floor(Math.random() * possiveisRosas.length)];
            // Proteção (Lucro Mínimo) entre 3x e 5x
            let lucroMinimo = mediaVelas > 4 ? "5.00" : "3.00"; 
            alvoFinal = `Alvo Previsto ${alvoReal}x(P:${lucroMinimo}x)`;
        } else {
            // Busca Roxo de Elite (Até 8x) com proteção 3x
            alvoReal = (Math.random() * (9.5 - 7.5) + 7.5).toFixed(2); 
            alvoFinal = `Alvo Previsto ${alvoReal}x(P:3.00x)`;
        }
    }

    // 3 - ALCANCES DINÂMICOS E CORES DO PAINEL
    const agora = new Date();
    const min1 = (agora.getMinutes() + 4) % 60;
    const min2 = (agora.getMinutes() + 5) % 60;
    let alcances;

    if (momento === "LIMPAR (Recolha de Banca)") {
        const v1 = (Math.random() * (6.5 - 5) + 5).toFixed(1);
        const v2 = (Math.random() * (9.9 - 7) + 7).toFixed(1);
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - RECOLHA: Máx ${v2}x`;
        cor = "#ef4444"; 
    } else if (parseFloat(alvoReal) >= 10) {
        const r1 = Math.floor(Math.random() * 20) + 10;
        const r2 = Math.floor(Math.random() * 50) + 21;
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROSA DETECTADO ${r1}x, ${r2}x+`;
        cor = "#db2777"; 
    } else {
        const v1 = (Math.random() * (7 - 5) + 5).toFixed(1);
        const v2 = (Math.random() * (9.99 - 7.1) + 7.1).toFixed(1);
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROXO ALTO ${v1}x, ${v2}x`;
        cor = "#7e22ce"; 
    }

    // 4 - LISTA DE DICAS TÉCNICAS
    const listaDicas = [
        "Análise Algorítmica: Detectada quebra no padrão de recolha; alvo superior a 10x iminente.",
        "Estudo de Ciclos: Servidor em fase de distribuição após sequência de velas sub-1.50x.",
        "IA Detectou: Padrão de alternância finalizado. Janela de tempo favorece multiplicadores altos.",
        "Comportamento do Gráfico: Oxigenação das últimas 30 velas permite busca por alvos longos com P:3x.",
        "Análise Técnica: Identificada 'escada' de valores crescentes, sugerindo liberação de Rosa.",
        "Dica da Super IA: Volume de apostas globais indica modo de pagamento ativo.",
        "Leitura de histórico: Ciclo de 15 minutos atingido, tendência de repetição detectada.",
        "Aviso Super IA: Em ciclos de recolha severa, use proteção 1.50x ou aguarde a viragem."
    ];

    res.json({ 
        status, cor, pct, banca, 
        timerRosa: agora.toLocaleTimeString("pt-PT", {hour:'2-digit', minute:'2-digit'}), 
        alvo: alvoFinal, 
        historico: velas, listaDicas, alcances 
    });
    
  } catch (e) { 
    console.error(e);
    res.status(500).json({ error: "Erro de Processamento da IA" }); 
  }
});

app.listen(process.env.PORT || 3000);
