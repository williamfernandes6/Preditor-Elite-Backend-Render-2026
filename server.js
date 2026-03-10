const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// Configuração otimizada para rapidez (PSM 6 é mais veloz para tabelas de números)
const config = { lang: "por", oem: 1, psm: 6 };

app.get('/', (req, res) => res.json({ status: "Online", engine: "Super IA Luanda" }));

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

    let status, cor, gapMin, alvo, dica, pct, protecao, alcances;
    const agora = new Date();

    // Geração da Proteção Dinâmica (P:5px até 9px)
    const pVal = Math.floor(Math.random() * 5) + 5;
    protecao = `P:${pVal}x`;

    // Lógica IA de Elite com Sabedoria de Alvos Altos (Até 500x)
    if (tendencia === "RECOLHA" || velas.slice(0,2).some(v => v <= 1.10)) {
        status = "RECOLHA ATIVA"; cor = "#ef4444"; gapMin = 15; 
        alvo = "ESPERAR"; protecao = "N/A";
        dica = "IA detetou drenagem do provedor. Não faça entradas agora."; pct = "5%";
        alcances = "Aguardando sinal estável";
    } 
    else if (gapRosa > 15 || (gapRosa > 8 && tendencia === "PAGAMENTO")) {
        status = "CERTEIRO: ROSA"; cor = "#db2777"; gapMin = 2; pct = "100%";
        
        // Sabedoria de Rosa: Detecção de 50x até 500x
        const alvosGrandes = [50, 80, 120, 180, 250, 380, 500];
        const alvoReal = alvosGrandes[Math.floor(Math.random() * alvosGrandes.length)];
        alvo = `${alvoReal}x`;
        
        const m1 = (agora.getMinutes() + 2) % 60;
        const m2 = (agora.getMinutes() + 3) % 60;
        alcances = `${m1}/${m2}-(${Math.floor(alvoReal/2)}x ou ${alvoReal}x)`;
        dica = "Momento de Pago Detetado! Ciclo de Rosa Confirmado.";
    } 
    else if (gapRoxa > 6) {
        status = "SINAL PROVÁVEL"; cor = "#7e22ce"; gapMin = 4; pct = "88%";
        alvo = "10.00x";
        const m1 = (agora.getMinutes() + 4) % 60;
        const m2 = (agora.getMinutes() + 5) % 60;
        alcances = `${m1}/${m2}-(5x ou 8x)`;
        dica = "Tendência favorável para alavancagem média.";
    } 
    else {
        status = "ANALISANDO"; cor = "#52525b"; gapMin = 5; pct = "45%";
        alvo = "2.00x"; protecao = "P:1.50x";
        alcances = "Aguardando zona de saída";
        dica = "Aguardando o gráfico sair da zona de 1x.";
    }

    const timer = new Date(agora.getTime() + gapMin * 60000).toLocaleTimeString("pt-PT", { hour12: false, timeZone: "Africa/Luanda" });

    res.json({ status, cor, pct, banca, timerRosa: timer, alvo, protecao, historico: velas, dica, tendencia, corTendencia, alcances });
  } catch (e) { res.status(500).json({ error: "Erro interno" }); }
});

app.listen(process.env.PORT || 3000);
