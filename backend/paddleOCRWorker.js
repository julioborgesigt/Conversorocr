const { spawn } = require('child_process');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Worker para processar OCR usando PaddleOCR (Python)
 * Mantém compatibilidade com interface do ocrWorker.js (Tesseract)
 */

/**
 * Verifica se PaddleOCR está instalado
 * @returns {Promise<boolean>}
 */
async function isConfigured() {
    try {
        // Verificar se Python está disponível
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

        return new Promise((resolve) => {
            const check = spawn(pythonCommand, ['-c', 'import paddleocr; print("OK")']);

            let output = '';
            check.stdout.on('data', (data) => {
                output += data.toString();
            });

            check.on('close', (code) => {
                resolve(code === 0 && output.includes('OK'));
            });

            check.on('error', () => {
                resolve(false);
            });

            // Timeout de 5 segundos
            setTimeout(() => {
                check.kill();
                resolve(false);
            }, 5000);
        });
    } catch (error) {
        return false;
    }
}

/**
 * Processa uma imagem usando PaddleOCR
 * @param {string} imagePath - Caminho para a imagem
 * @param {string} language - Código do idioma (por, eng, spa, etc.)
 * @returns {Promise<Object>}
 */
async function processDocument(imagePath, language = 'por') {
    try {
        // Obter dimensões da imagem (fallback caso Python falhe)
        const metadata = await sharp(imagePath).metadata();
        const imageWidth = metadata.width;
        const imageHeight = metadata.height;

        // Caminho do script Python
        const scriptPath = path.join(__dirname, 'paddleocr_processor.py');

        // Verificar se script existe
        try {
            await fs.access(scriptPath);
        } catch (error) {
            throw new Error('Script paddleocr_processor.py não encontrado');
        }

        // Comando Python (python3 no Linux/Mac, python no Windows)
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

        // Executar script Python
        return new Promise((resolve, reject) => {
            const python = spawn(pythonCommand, [scriptPath, imagePath, language]);

            let stdoutData = '';
            let stderrData = '';

            python.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            python.on('close', (code) => {
                if (code !== 0) {
                    console.error('PaddleOCR stderr:', stderrData);

                    // Erro específico: módulo não instalado
                    if (stderrData.includes('No module named') || stderrData.includes('ModuleNotFoundError')) {
                        return reject(new Error(
                            'PaddleOCR não está instalado.\n' +
                            'Instale com: pip install paddleocr pillow\n' +
                            'Ou use outro motor OCR (Tesseract ou Document AI)'
                        ));
                    }

                    return reject(new Error(`PaddleOCR falhou com código ${code}: ${stderrData}`));
                }

                try {
                    const result = JSON.parse(stdoutData);

                    // Garantir que temos as dimensões da imagem
                    if (result.success && result.data) {
                        result.data.imageWidth = result.data.imageWidth || imageWidth;
                        result.data.imageHeight = result.data.imageHeight || imageHeight;
                    }

                    resolve(result);
                } catch (error) {
                    console.error('PaddleOCR output:', stdoutData);
                    reject(new Error(`Erro ao parsear resultado PaddleOCR: ${error.message}`));
                }
            });

            python.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    reject(new Error(
                        'Python não encontrado.\n' +
                        'Instale Python 3: https://www.python.org/downloads/\n' +
                        'Ou use outro motor OCR (Tesseract ou Document AI)'
                    ));
                } else {
                    reject(error);
                }
            });

            // Timeout de 60 segundos por imagem
            setTimeout(() => {
                python.kill();
                reject(new Error('Timeout: PaddleOCR demorou mais de 60 segundos'));
            }, 60000);
        });

    } catch (error) {
        console.error('Erro no PaddleOCR worker:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    processDocument,
    isConfigured
};
