// ocrWorker.js - Worker Thread para Processamento Paralelo de OCR
const { parentPort, workerData } = require('worker_threads');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;

(async () => {
    try {
        const { imagePath, language, params, enhanceImage } = workerData;

        // CORREÇÃO: Obter dimensões da imagem ANTES de processar
        // Isso é necessário para calcular escala correta no PDF pesquisável
        const metadata = await sharp(imagePath).metadata();

        // Pré-processar imagem se necessário
        let processedPath = imagePath;
        if (enhanceImage) {
            processedPath = imagePath.replace('.png', '_enhanced.png');
            // Pipeline otimizada e segura de pré-processamento
            await sharp(imagePath)
                .greyscale()       // Converter para escala de cinza
                .normalize()       // Melhorar contraste (adaptativo, melhor que threshold fixo)
                .sharpen(1)        // Adicionar nitidez moderada
                .toFile(processedPath);
        }

        // Criar worker do Tesseract
        const worker = await createWorker(language, 1, {
            cachePath: './tesseract-cache',
            logger: () => {} // Silenciar logs no worker
        });

        // Aplicar parâmetros
        if (params) {
            await worker.setParameters(params);
        }

        // Executar OCR
        const result = await worker.recognize(processedPath);

        // Limpar
        await worker.terminate();
        if (processedPath !== imagePath) {
            await fs.unlink(processedPath).catch(() => {});
        }

        // Enviar resultado de volta para o thread principal
        // CORREÇÃO: Incluir dimensões da imagem para cálculo de escala no PDF pesquisável
        parentPort.postMessage({
            success: true,
            data: {
                text: result.data.text,
                confidence: result.data.confidence,
                words: result.data.words,
                imageWidth: metadata.width,   // Largura real da imagem
                imageHeight: metadata.height  // Altura real da imagem
            }
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
})();
