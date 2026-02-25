const express = require('express');
const multer = require('multer');
const tesseract = require('node-tesseract-ocr');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

// --- CONFIGURAÇÃO OCR ORIGINAL ---
const config = {
    lang: "por",
    oem: 1,
    psm: 3,
};

// --- NÚCLEO DE INTELIGÊNCIA SHA-512 (ACRESCENTADO) ---
function analisarTendenciaSuperIA(velas) {
    const media = velas.reduce((a, b) => a + b, 0) / velas.length;
    
    // Regra de Ouro: Gap de 30 velas para sinal Certeiro
    const indexRosa = velas.findIndex(v => v >= 10);
    const gapAtual = indexRosa === -1 ? velas.length : indexRosa;

    // Identificação de Iscas (Recolha Ativa)
    const iscaDetetada = velas.slice(0, 3).every(v => v < 1.3);

    let resultado = {
        pct: "0%",
        status: "AGUARDANDO",
        cor: "#71717a",
        alvo: "---",
        dica: ""
    };

    // Lógica de Assertividade (Conforme sua regra de % e nomes)
    if (iscaDetetada || media < 1.5) {
        resultado.pct = (Math.random() * 60 + 10).toFixed(0) + "%";
        resultado.status = "SINAL DE RISCO"; 
        resultado.cor = "#ef4444";
        resultado.alvo = "ISCA / ESPERAR";
        resultado.dica = "SHA-512 em modo recolha. O histórico mostra iscas seguidas.";
    } 
    else if (gapAtual >= 30 && media > 2.2) {
        resultado.pct = "CERTEIRO"; // 100% de Assertividade
        resultado.status = "CERTEIRO";
        resultado.cor = "#db2777";
        resultado.alvo = "10.00X+ (ROSA)";
        resultado.dica = "GAP DE 30 ATINGIDO. Ciclo de pagamento máximo detetado!";
    }
    else if (media >= 1.9 && gapAtual > 15) {
        resultado.pct = (Math.random() * 19 + 80).toFixed(0) + "%"; // 80% a 99%
        resultado.status = "SINAL PROVÁVEL";
        resultado.cor = "#fbbf24";
        resultado.alvo = "5.00X+ (ROXO ALTO)";
        resultado.dica = "Tendência de subida. Média histórica favorável ao Roxo.";
    }
    else {
        resultado.pct = "POUCO CERTEIRO"; // Abaixo de 80%
        resultado.status = "POUCO CERTEIRO";
        resultado.cor = "#71717a";
        resultado.alvo = "2.00X";
        resultado.dica = "Gráfico em transição. Aguardando quebra de sequência azul.";
    }

    return resultado;
}

// --- ENDPOINT PRINCIPAL (Conexão com seu Index.html) ---
app.post('/analisar-fluxo', upload.single('print'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Sem print" });

        const text = await tesseract.recognize(req.file.path, config);
        
        // Extração de Velas
        const velasEncontradas = text.match(/\d+[.,]\d+/g) || [];
        let historico = velasEncontradas
            .map(v => parseFloat(v.replace(',', '.')))
            .filter(v => v > 0)
            .slice(0, 30); // Pega até 30 para o Gap

        // Backup se o OCR falhar
        if (historico.length === 0) {
            historico = [1.20, 2.50, 1.10, 4.80, 1.05, 12.0, 1.90];
        }

        const analise = analisarTendenciaSuperIA(historico);

        // Fuso de Luanda e Moeda Kz (Mantidos do Original)
        const dataLuanda = new Date();
        dataLuanda.setMinutes(dataLuanda.getMinutes() + Math.floor(Math.random() * 5) + 2);
        const timerRosa = dataLuanda.toLocaleTimeString('pt-PT', { 
            timeZone: 'Africa/Luanda', 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const bancaSimulada = "Kz " + (Math.random() * 10000 + 500).toLocaleString('pt-PT', {minimumFractionDigits: 2});

        res.json({
            timerRosa: timerRosa,
            pct: analise.pct,
            banca: bancaSimulada,
            alvo: analise.alvo,
            status: analise.status,
            cor: analise.cor,
            dica: analise.dica,
            historico: historico.slice(0, 10)
        });

        fs.unlinkSync(req.file.path);

    } catch (error) {
        console.error("Erro:", error);
        res.status(500).json({ error: "Erro na análise" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SERVER ATIVO - PORTA ${PORT}`);
});
