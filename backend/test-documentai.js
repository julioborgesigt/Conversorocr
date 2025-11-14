/**
 * Script de teste para validar configuração do Google Cloud Document AI
 * Execução: node test-documentai.js
 */

require('dotenv').config();
const ocrEngine = require('./ocrEngine');

console.log('🔧 Teste de Configuração do Document AI\n');

// 1. Verificar variáveis de ambiente
console.log('📋 Variáveis de Ambiente:');
console.log(`   GOOGLE_PROJECT_ID: ${process.env.GOOGLE_PROJECT_ID || '❌ NÃO DEFINIDO'}`);
console.log(`   GOOGLE_PROCESSOR_ID: ${process.env.GOOGLE_PROCESSOR_ID || '❌ NÃO DEFINIDO'}`);
console.log(`   GOOGLE_LOCATION: ${process.env.GOOGLE_LOCATION || 'us (padrão)'}`);
console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || '❌ NÃO DEFINIDO'}`);
console.log(`   OCR_ENGINE: ${process.env.OCR_ENGINE || 'tesseract (padrão)'}`);
console.log('');

// 2. Verificar status do motor OCR
const engineInfo = ocrEngine.getEngineInfo();
console.log('🤖 Motor OCR Configurado:');
console.log(`   Nome: ${engineInfo.name}`);
console.log(`   Descrição: ${engineInfo.description}`);
console.log(`   Custo: ${engineInfo.cost}`);
console.log(`   Configurado: ${engineInfo.configured ? '✅ SIM' : '❌ NÃO'}`);
console.log('');

// 3. Verificar arquivo de credenciais
const fs = require('fs');
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (credentialsPath) {
    if (fs.existsSync(credentialsPath)) {
        console.log('✅ Arquivo de credenciais encontrado');

        try {
            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            console.log(`   Project ID no JSON: ${credentials.project_id}`);
            console.log(`   Client Email: ${credentials.client_email}`);

            if (credentials.project_id !== process.env.GOOGLE_PROJECT_ID) {
                console.log('   ⚠️ AVISO: PROJECT_ID no .env diferente do JSON!');
            }
        } catch (error) {
            console.log('   ❌ Erro ao ler JSON:', error.message);
        }
    } else {
        console.log(`❌ Arquivo de credenciais NÃO encontrado em: ${credentialsPath}`);
    }
} else {
    console.log('❌ GOOGLE_APPLICATION_CREDENTIALS não definido');
}

console.log('\n' + '='.repeat(60));

if (engineInfo.configured && engineInfo.engine === 'documentai') {
    console.log('✅ CONFIGURAÇÃO VÁLIDA!');
    console.log('');
    console.log('Próximos passos:');
    console.log('1. Execute: npm start');
    console.log('2. Acesse: http://localhost:3000');
    console.log('3. Carregue um PDF e teste o OCR premium!');
} else if (engineInfo.engine === 'tesseract') {
    console.log('ℹ️ Sistema configurado para usar Tesseract (modo gratuito)');
    console.log('');
    console.log('Para ativar Document AI:');
    console.log('1. Edite backend/.env');
    console.log('2. Mude OCR_ENGINE=documentai');
    console.log('3. Reinicie o servidor');
} else {
    console.log('❌ CONFIGURAÇÃO INCOMPLETA');
    console.log('');
    console.log('Verifique:');
    console.log('1. Arquivo backend/.env existe e está correto');
    console.log('2. Todas as variáveis GOOGLE_* estão definidas');
    console.log('3. Caminho do arquivo JSON está correto (use \\\\ no Windows)');
}

console.log('='.repeat(60));
