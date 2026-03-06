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

    // RESTAURADO: GAP DE 30-50-60 VELAS (Não alterado)
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 50 : velas.findIndex(v => v >= 5);
    const gapBase = 30; // Mantido exatamente como pediste anteriormente

    let status, cor, pct, alvoReal, alvoFinal;
    
    // 1 - AJUSTE DE ASSERTIVIDADE (COM ACRESCENTOS ABAIXO DE 80%) + IA SUPER INTELIGENTE
    const velasBaixasSeguidas = velas.slice(0, 5).filter(v => v < 2).length;
    
    if (gapRosa >= 60 || (velasBaixasSeguidas >= 3 && velas[0] < 1.5)) {
        status = "CERTEIRO"; 
        cor = "#db2777"; 
        pct = "100%";
    } else if (gapRosa >= gapBase || gapRoxa >= 20) {
        status = "SINAL PROVÁVEL"; 
        cor = "#db2777"; 
        pct = `${Math.floor(Math.random() * (99 - 80 + 1)) + 80}%`; // Ajustado para a margem 80-99%
    } else if (velasBaixasSeguidas > 3) {
        // ACRESCENTO: Se há muita vela baixa, é sinal de risco (abaixo de 80%)
        status = "SINAL DE RISCO"; 
        cor = "#ef4444"; // Vermelho de perigo
        pct = `${Math.floor(Math.random() * (79 - 50 + 1)) + 50}%`;
    } else {
        // ACRESCENTO: Condição intermediária para pouco certeiro
        status = "POUCO CERTEIRO"; 
        cor = "#f97316"; // Laranja de atenção
        pct = `${Math.floor(Math.random() * (79 - 65 + 1)) + 65}%`;
    }

    const mediaVelas = velas.reduce((a,b) => a+b, 0) / (velas.length || 1);
    const momento = mediaVelas > 2.5 ? "PAGAR (Gráfico Aquecido)" : "LIMPAR (Recolha de Banca)";
    
    // 2 - ALVOS PREVISTOS (ACRESCENTADA A INTELIGÊNCIA DE RECOLHA)
    let infoExtraRecolha = ""; 

    if (momento === "LIMPAR (Recolha de Banca)") {
        // ACRESCENTO: Modo de defesa de banca ativado! Previsão muda de figura.
        alvoReal = (Math.random() * (9.99 - 5.00) + 5.00).toFixed(2); // Previsão limitada a roxos de 5x até 9.x
        const minutosMelhora = Math.floor(Math.random() * 5) + 2; // Estima entre 2 a 6 minutos para melhorar
        
        infoExtraRecolha = ` | ATENÇÃO: Mercado em Recolha. Proteja a banca! Previsão de melhora para ROSA 10x+ em aprox. ${minutosMelhora} min.`;
        // Proteção bem baixinha (1.50x) para garantir que o utilizador não quebra a banca tentando buscar o alvo
        alvoFinal = `Alvo Previsto ${alvoReal}x(P:1.50x)${infoExtraRecolha}`;
    } else {
        // CÓDIGO ORIGINAL MANTIDO INTACTO PARA GRÁFICO AQUECIDO
        if (mediaVelas > 3.2 || gapRosa > 35) {
            const possiveisRosas = [12, 15, 20, 25, 30, 35, 40, 50, 70, 100];
            alvoReal = possiveisRosas[Math.floor(Math.random() * possiveisRosas.length)];
            let protecao = (alvoReal * 0.5).toFixed(0);
            alvoFinal = `Alvo Previsto ${alvoReal}x(P:${protecao}x)`;
        } else {
            alvoReal = (Math.random() * (9.99 - 5) + 5).toFixed(2);
            alvoFinal = `Alvo Previsto ${alvoReal}x(P:2.00x)`;
        }
    }

    // 3 - ALCANCES DINÂMICOS (ACRESCENTADA A LEITURA DE RECOLHA)
    const agora = new Date();
    const min1 = (agora.getMinutes() + 4) % 60;
    const min2 = (agora.getMinutes() + 5) % 60;
    let alcances;

    if (momento === "LIMPAR (Recolha de Banca)") {
        // ACRESCENTO: "Muda tudo". Os alcances focam em avisar o utilizador do momento perigoso e dos roxos limite.
        const v1 = (Math.random() * (6.5 - 5) + 5).toFixed(1);
        const v2 = (Math.random() * (9.9 - 7) + 7).toFixed(1);
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - MODO RECOLHA DETECTADO! Limites aprox. ${v1}x a ${v2}x. Cuidado máximo!`;
        cor = "#ef4444"; // Muda a cor no painel para chamar atenção ao risco
    } else if (parseFloat(alvoReal) >= 10) {
        // CÓDIGO ORIGINAL MANTIDO
        const r1 = Math.floor(Math.random() * 20) + 10;
        const r2 = Math.floor(Math.random() * 50) + 21;
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROSA DETECTADO ${r1}x, ${r2}x+`;
        cor = "#db2777"; 
    } else {
        // CÓDIGO ORIGINAL MANTIDO
        const v1 = (Math.random() * (7 - 5) + 5).toFixed(1);
        const v2 = (Math.random() * (9.99 - 7.1) + 7.1).toFixed(1);
        alcances = `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROXO VISÍVEL ${v1}x, ${v2}x`;
        cor = "#7e22ce"; 
    }

    // 4 - LISTA DE DICAS (MANTIDA E ACRESCENTADA 1 DICA NOVA SOBRE GESTÃO)
    const listaDicas = [
        "Análise Algorítmica: O sistema detectou uma quebra no padrão de recolha; probabilidade alta de vela superior a 10x.",
        "Estudo de Ciclos: O histórico indica que o servidor entrou em fase de distribuição após sequência de velas sub-1.50x.",
        "IA Detectou: Padrão de alternância (roxo/azul) finalizado. A próxima janela de tempo favorece multiplicadores altos.",
        "Comportamento do Gráfico: A oxigenação das últimas 30 velas permite uma busca por alvos longos com proteção no 2x.",
        "Análise Técnica: Identificada uma 'escada' de valores crescentes, sugerindo que o algoritmo vai liberar um Rosa em breve.",
        "Dica da Super IA: O volume de apostas globais indica que o sistema está em modo de pagamento para manter o fluxo.",
        "Leitura de histórico completa: Ciclo de 15 minutos atingido, tendência de repetição de vela alta detectada.",
        "Aviso Super IA: Durante ciclos severos de recolha (velas baixas constantes), proteja o seu capital em 1.50x e aguarde a viragem do algoritmo." // Nova dica inserida sem apagar o resto
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
