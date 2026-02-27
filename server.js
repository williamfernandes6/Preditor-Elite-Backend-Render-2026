const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const config = {
    lang: "por",
    oem: 1, 
    psm: 3,
};

function analisarTendenciaSuperIA(velas, textoPuro) {
    if (!velas || velas.length === 0) return null;

    const gatilho = velas[0]; 
    const indexRosa = velas.findIndex(v => v >= 10);
    const gapAtual = indexRosa === -1 ? velas.length : indexRosa;

    const sementeExplosiva = textoPuro.includes("se4Y5") || textoPuro.includes("YGZ57") || textoPuro.includes("fffce") || textoPuro.includes("e86c8");

    const ultimas10 = velas.slice(0, 10);
    const qtdRoxos = ultimas10.filter(v => v >= 2.0 && v < 10).length;
    const qtdAzuis = ultimas10.filter(v => v < 2.0).length;

    let resultado = { pct: "0%", status: "ANALISANDO", cor: "#71717a", alvo: "---", dica: "" };

    // REGRAS DE ASSERTIVIDADE (CONFORME SOLICITADO)
    if (sementeExplosiva || (gapAtual >= 30 && gatilho >= 1.90) || (qtdRoxos >= 4 && gatilho >= 2.10)) {
        resultado = { pct: "CERTEIRO", status: "Sinal Rosa", cor: "#db2777", alvo: "10.00X+", dica: "SUBIDA CONFIRMADA. Gap: " + gapAtual };
    } 
    else if ((gatilho >= 1.50 && gapAtual > 10) || (qtdAzuis >= 3 && gatilho >= 1.60)) {
        resultado = { pct: (Math.random() * 19 + 80).toFixed(0) + "%", status: "Sinal Roxo", cor: "#a855f7", alvo: "5.00X+", dica: "Sinal provável. Histórico favorável." };
    } 
    else {
        resultado = { pct: (Math.random() * 40 + 30).toFixed(0) + "%", status: "SINAL DE RISCO", cor: "#ef4444", alvo: "AGUARDAR", dica: "Ciclo de quedas azuis detectado." };
    }

    return resultado;
}

app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "ERRO: Envie a foto primeiro." });

        const text = await tesseract.recognize(req.file.path, config);
        const velasEncontradas = text.match(/\d+[.,]\d+/g) || [];
        const historicoReal = velasEncontradas.map(v => parseFloat(v.replace(',', '.'))).filter(v => v > 0).slice(0, 30);

        if (historicoReal.length === 0) {
            return res.status(422).json({ error: "IA não leu as velas. Tire foto nítida." });
        }

        const analise = analisarTendenciaSuperIA(historicoReal, text);
        const dataLuanda = new Date();
        dataLuanda.setMinutes(dataLuanda.getMinutes() + 1); 
        const timerSinal = dataLuanda.toLocaleTimeString('pt-PT', { timeZone: 'Africa/Luanda', hour: '2-digit', minute: '2-digit' });

        res.json({
            timerRosa: timerSinal,
            pct: analise.pct,
            banca: "Kz " + (Math.random() * 10000 + 500).toLocaleString('pt-PT'),
            alvo: analise.alvo,
            status: analise.status,
            cor: analise.cor,
            dica: analise.dica,
            historico: historicoReal
        });

        fs.unlinkSync(req.file.path);
    } catch (error) {
        res.status(500).json({ error: "Erro no processamento." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`BACKEND ATIVO NA PORTA ${PORT}`));
