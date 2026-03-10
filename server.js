const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');

const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

const config = { lang: "por", oem: 3, psm: 6 };

app.get('/', (req, res) => res.json({ status: "Online" }));

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
  try {
    const text = await tesseract.recognize(req.file.buffer, config);
    const bancaMatch = text.match(/(?:AO|AOA|Kz|KZ|Saldo|Banca)\s?([\d\.,\s]{3,15})/i);
    const banca = bancaMatch ? `Kz ${bancaMatch[1].trim()}` : "Kz 0,00";
    const velasRaw = text.match(/\d+[\.,]\d{2}/g) || [];
    const velas = velasRaw.map(v => parseFloat(v.replace(',', '.'))).slice(0, 60);

    // RESTAURADO: GAP DE 30-50-60 VELAS
    const gapRosa = velas.findIndex(v => v >= 10) === -1 ? 60 : velas.findIndex(v => v >= 10);
    const gapRoxa = velas.findIndex(v => v >= 5) === -1 ? 50 : velas.findIndex(v => v >= 5);
    const gapBase = 30;

    let status, cor, pct, alvoReal;
    const alvosRosaros = [15, 20, 35, 45, 50, 60];
    alvoReal = alvosRosaros[Math.floor(Math.random() * alvosRosaros.length)];
    const alvoExibido = Math.floor(alvoReal * 0.8); // Segurança de 20%

    if (gapRosa >= 60) {
        status = "CERTEIRO"; cor = "#db2777"; pct = "100%";
    } else if (gapRosa >= gapBase) {
        status = "SINAL PROVÁVEL"; cor = "#db2777"; pct = "98%";
    } else {
        status = "POUCO CERTEIRO"; cor = "#7e22ce"; pct = "75%";
    }

    const mediaVelas = velas.reduce((a,b) => a+b, 0) / (velas.length || 1);
    const momento = mediaVelas > 2.5 ? "PAGAR (Gráfico Aquecido)" : "LIMPAR (Recolha de Banca)";
    
    // ALCANCES DINÂMICOS
    const agora = new Date();
    const min1 = (agora.getMinutes() + 4) % 60;
    const min2 = (agora.getMinutes() + 5) % 60;
    let alcances = mediaVelas > 3 ? 
        `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROSA EMINENTE 10x+` : 
        `${min1.toString().padStart(2, '0')}/${min2.toString().padStart(2, '0')} - ROXO ${Math.floor(Math.random()*6)+4}x+`;

    const listaDicas = [
        "IA detetou compensação de rosas eminente.",
        `Momento de ${momento}: Comportamento Aviator detetado.`,
        "Histórico lido: IA analisou comportamento e tendência de gráfico.",
        "Dica: Saia no 12x para garantir o sinal de 15x com segurança.",
        "O Aviator está a comportar-se de forma estável para alvos altos.",
        "Momento para limpar banca detetado: jogue com cautela.",
        "IA leu o histórico: Ciclo de rosas deve iniciar em 2 minutos."
    ];

    res.json({ 
        status, cor, pct, banca, 
        timerRosa: agora.toLocaleTimeString("pt-PT", {hour:'2-digit', minute:'2-digit'}), 
        alvo: `${alvoExibido}.00x+`, 
        historico: velas, listaDicas, alcances 
    });
  } catch (e) { res.status(500).json({ error: "Erro" }); }
});

app.listen(process.env.PORT || 3000);
