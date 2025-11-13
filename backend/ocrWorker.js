// ocrWorker.js - Worker Thread para Processamento Paralelo de OCR
const { parentPort, workerData } = require('worker_threads');
const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;

(async () => {
    try {
        const { imagePath, language, params, enhanceImage } = workerData;

        // Pré-processar imagem se necessário
        let processedPath = imagePath;
        if (enhanceImage) {
            processedPath = imagePath.replace('.png', '_enhanced.png');
            await sharp(imagePath)
                .greyscale()
                .normalize()
                .sharpen()
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
        parentPort.postMessage({
            success: true,
            data: {
                text: result.data.text,
                confidence: result.data.confidence,
                words: result.data.words
            }
        });

    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
})();
