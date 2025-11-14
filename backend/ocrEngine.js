const { Worker } = require('worker_threads');
const path = require('path');
const documentAI = require('./documentAIWorker');

/**
 * Factory para selecionar o motor OCR apropriado
 * Suporta: Tesseract (local, grátis) e Document AI (nuvem, premium)
 */

const OCR_ENGINES = {
    TESSERACT: 'tesseract',
    DOCUMENTAI: 'documentai',
    HYBRID: 'hybrid' // Tenta Document AI, fallback para Tesseract
};

/**
 * Obtém o motor OCR configurado via .env
 * @returns {string} - 'tesseract', 'documentai', ou 'hybrid'
 */
function getConfiguredEngine() {
    const engine = process.env.OCR_ENGINE || 'tesseract';
    return engine.toLowerCase();
}

/**
 * Processa uma imagem usando o motor configurado ou especificado
 * @param {string} imagePath - Caminho para a imagem
 * @param {string} [engineOverride] - Motor específico (sobrescreve .env)
 * @returns {Promise<Object>} - Resultado do OCR
 */
async function processImage(imagePath, engineOverride = null) {
    const engine = engineOverride ? engineOverride.toLowerCase() : getConfiguredEngine();

    console.log(`🔧 Motor OCR selecionado: ${engine}`);

    switch (engine) {
        case OCR_ENGINES.DOCUMENTAI:
            return await processWithDocumentAI(imagePath);

        case OCR_ENGINES.HYBRID:
            return await processHybrid(imagePath);

        case OCR_ENGINES.TESSERACT:
        default:
            return await processWithTesseract(imagePath);
    }
}

/**
 * Processa com Tesseract (worker thread)
 * @param {string} imagePath
 * @returns {Promise<Object>}
 */
function processWithTesseract(imagePath) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'ocrWorker.js'), {
            workerData: { imagePath }
        });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Tesseract worker stopped with exit code ${code}`));
            }
        });
    });
}

/**
 * Processa com Google Document AI
 * @param {string} imagePath
 * @returns {Promise<Object>}
 */
async function processWithDocumentAI(imagePath) {
    if (!documentAI.isConfigured()) {
        throw new Error(
            '❌ Document AI não está configurado.\n' +
            'Configure as variáveis de ambiente:\n' +
            '  - GOOGLE_PROJECT_ID\n' +
            '  - GOOGLE_PROCESSOR_ID\n' +
            '  - GOOGLE_APPLICATION_CREDENTIALS\n' +
            'Ou use OCR_ENGINE=tesseract para modo gratuito.'
        );
    }

    console.log(`🤖 Usando Google Document AI para: ${path.basename(imagePath)}`);
    return await documentAI.processDocument(imagePath);
}

/**
 * Modo híbrido: Tenta Document AI, fallback para Tesseract
 * @param {string} imagePath
 * @returns {Promise<Object>}
 */
async function processHybrid(imagePath) {
    // Verificar se Document AI está configurado
    if (!documentAI.isConfigured()) {
        console.log('⚠️ Document AI não configurado, usando Tesseract');
        return await processWithTesseract(imagePath);
    }

    try {
        // Tentar Document AI primeiro
        console.log(`🔄 Modo Híbrido: tentando Document AI...`);
        const result = await documentAI.processDocument(imagePath);

        if (result.success) {
            console.log(`✅ Document AI sucesso!`);
            return result;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        // Fallback para Tesseract
        console.log(`⚠️ Document AI falhou (${error.message}), usando Tesseract`);
        return await processWithTesseract(imagePath);
    }
}

/**
 * Retorna informações sobre o motor configurado
 * @returns {Object}
 */
function getEngineInfo() {
    const engine = getConfiguredEngine();

    const info = {
        engine,
        name: '',
        description: '',
        cost: '',
        configured: true
    };

    switch (engine) {
        case OCR_ENGINES.DOCUMENTAI:
            info.name = 'Google Document AI';
            info.description = 'OCR premium com qualidade 95-99%';
            info.cost = 'US$ 1,50 / 1000 páginas';
            info.configured = documentAI.isConfigured();
            break;

        case OCR_ENGINES.HYBRID:
            info.name = 'Híbrido (Document AI → Tesseract)';
            info.description = 'Tenta Document AI, fallback para Tesseract';
            info.cost = 'Variável (depende do fallback)';
            info.configured = true; // Sempre configurado (Tesseract sempre disponível)
            break;

        case OCR_ENGINES.TESSERACT:
        default:
            info.name = 'Tesseract.js';
            info.description = 'OCR local gratuito com qualidade 85-90%';
            info.cost = 'Grátis';
            info.configured = true;
            break;
    }

    return info;
}

/**
 * Retorna lista de todos os motores OCR disponíveis
 * @returns {Array<Object>}
 */
function getAllEngines() {
    const documentAIConfigured = documentAI.isConfigured();
    const defaultEngine = getConfiguredEngine();

    return [
        {
            id: 'tesseract',
            name: 'Tesseract.js',
            description: 'OCR local gratuito',
            quality: '85-90%',
            cost: 'Grátis',
            speed: 'Médio (3-5s/página)',
            privacy: '100% Local',
            features: ['Gratuito', 'Offline', 'Privado'],
            available: true,
            recommended: false,
            icon: '🔧'
        },
        {
            id: 'documentai',
            name: 'Google Document AI',
            description: 'OCR premium na nuvem',
            quality: '95-99%',
            cost: 'US$ 1,50 / 1000 páginas',
            speed: 'Rápido (1-2s/página)',
            privacy: 'Upload para Google Cloud',
            features: ['Alta qualidade', 'Tabelas', 'Fórmulas matemáticas'],
            available: documentAIConfigured,
            recommended: documentAIConfigured,
            icon: '🤖',
            requiresConfig: !documentAIConfigured
        },
        {
            id: 'hybrid',
            name: 'Modo Híbrido',
            description: 'Document AI com fallback',
            quality: '95-99% ou 85-90%',
            cost: 'Variável',
            speed: 'Variável',
            privacy: 'Depende do motor usado',
            features: ['Melhor dos dois mundos', 'Sempre funciona', 'Inteligente'],
            available: true,
            recommended: false,
            icon: '🔄'
        }
    ].map(engine => ({
        ...engine,
        isDefault: engine.id === defaultEngine
    }));
}

module.exports = {
    processImage,
    getEngineInfo,
    getAllEngines,
    OCR_ENGINES
};
