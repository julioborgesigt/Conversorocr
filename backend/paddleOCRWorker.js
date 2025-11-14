const { spawn } = require('child_process');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Worker para processar OCR usando PaddleOCR (Python)
 * Mantém compatibilidade com interface do ocrWorker.js (Tesseract)
 */

// Cache da verificação de configuração
let configCache = null;
let lastCheckTime = 0;
let workingPythonCommand = null; // Cachear qual comando Python funcionou
const CACHE_DURATION = 60000; // 1 minuto

/**
 * Verifica se PaddleOCR está instalado (com cache)
 * @returns {Promise<boolean>}
 */
async function isConfigured() {
    try {
        // Usar cache se disponível e recente
        const now = Date.now();
        if (configCache !== null && (now - lastCheckTime) < CACHE_DURATION) {
            return configCache;
        }

        // Tentar vários comandos Python (python, python3, py)
        const pythonCommands = process.platform === 'win32'
            ? ['python3', 'python', 'py']  // Ordem: python3 primeiro (você tem)
            : ['python3', 'python'];

        for (const pythonCommand of pythonCommands) {
            const result = await testPythonCommand(pythonCommand);
            if (result) {
                console.log(`✅ PaddleOCR detectado via ${pythonCommand}`);
                workingPythonCommand = pythonCommand; // Salvar qual comando funcionou
                configCache = true;
                lastCheckTime = now;
                return true;
            }
        }

        workingPythonCommand = null; // Nenhum comando funcionou
        configCache = false;
        lastCheckTime = now;
        return false;
    } catch (error) {
        workingPythonCommand = null;
        configCache = false;
        lastCheckTime = Date.now();
        return false;
    }
}

/**
 * Retorna qual comando Python está funcionando (para debug)
 * @returns {string|null}
 */
function getWorkingPythonCommand() {
    return workingPythonCommand;
}

/**
 * Testa se PaddleOCR está disponível via comando Python específico
 * Usa 'pip show' ao invés de 'import' para evitar download de modelos
 * @param {string} pythonCommand
 * @returns {Promise<boolean>}
 */
function testPythonCommand(pythonCommand) {
    return new Promise((resolve) => {
        // Primeiro verificar se Python existe
        const pythonCheck = spawn(pythonCommand, ['--version'], {
            shell: true
        });

        pythonCheck.on('error', () => {
            resolve(false);
        });

        pythonCheck.on('close', (code) => {
            if (code !== 0) {
                resolve(false);
                return;
            }

            // Python existe, agora verificar se paddleocr está instalado
            // Usar 'pip show' é MUITO mais rápido que importar (não baixa modelos)
            const pipCommand = pythonCommand === 'py' ? 'pip' : `${pythonCommand} -m pip`;
            const pipCheck = spawn(pipCommand, ['show', 'paddleocr'], {
                shell: true
            });

            let stdout = '';

            pipCheck.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pipCheck.on('close', (pipCode) => {
                // Se 'pip show paddleocr' retornar 0 e tiver "Name: paddleocr", está instalado
                resolve(pipCode === 0 && stdout.includes('Name: paddleocr'));
            });

            pipCheck.on('error', () => {
                resolve(false);
            });

            // Timeout curto (5s) pois pip show é rápido
            setTimeout(() => {
                pipCheck.kill();
                resolve(false);
            }, 5000);
        });

        // Timeout para verificação do Python
        setTimeout(() => {
            pythonCheck.kill();
            resolve(false);
        }, 3000);
    });
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

        // Usar o comando Python que foi validado na verificação
        // Se PYTHON_COMMAND está definido no .env, usar ele (override manual)
        // Caso contrário, usar o comando que funcionou na verificação
        // Fallback: tentar python3 (Linux/Mac) ou python (Windows)
        const pythonCommand = process.env.PYTHON_COMMAND
            || workingPythonCommand
            || (process.platform === 'win32' ? 'python' : 'python3');

        console.log(`🐍 Usando comando Python: ${pythonCommand}`);

        // Executar script Python
        return new Promise((resolve, reject) => {
            const python = spawn(pythonCommand, [scriptPath, imagePath, language], {
                shell: true  // Necessário para comandos como "py -3.11"
            });

            let stdoutData = '';
            let stderrData = '';

            python.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            python.on('close', (code) => {
                // Sempre mostrar stderr (pode ter warnings/debug mesmo com sucesso)
                if (stderrData) {
                    console.log('PaddleOCR stderr:', stderrData);
                }

                if (code !== 0) {
                    console.error('❌ PaddleOCR falhou com código:', code);
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

                // Debug: mostrar o que recebemos
                console.log('PaddleOCR stdout length:', stdoutData.length);
                console.log('PaddleOCR stdout (primeiros 500 chars):', stdoutData.substring(0, 500));

                if (!stdoutData || stdoutData.trim().length === 0) {
                    console.error('❌ PaddleOCR retornou stdout vazio!');
                    return reject(new Error('PaddleOCR não retornou dados'));
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
    isConfigured,
    getWorkingPythonCommand
};
