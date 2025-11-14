/**
 * Script de diagnóstico para testar configuração do PaddleOCR
 * Execute: node test-paddleocr-config.js
 */

require('dotenv').config();
const { spawn } = require('child_process');

console.log('🔍 Testando configuração do PaddleOCR...\n');

// Testar Python
console.log('1️⃣ Testando Python...');

const pythonCommands = ['python3', 'python', 'py'];
let pythonFound = false;

async function testPythonCommand(cmd) {
    return new Promise((resolve) => {
        const test = spawn(cmd, ['--version']);
        let output = '';

        test.stdout.on('data', (data) => {
            output += data.toString();
        });

        test.stderr.on('data', (data) => {
            output += data.toString();
        });

        test.on('close', (code) => {
            if (code === 0) {
                console.log(`   ✅ ${cmd}: ${output.trim()}`);
                resolve({ cmd, success: true, output });
            } else {
                resolve({ cmd, success: false });
            }
        });

        test.on('error', () => {
            resolve({ cmd, success: false });
        });

        setTimeout(() => {
            test.kill();
            resolve({ cmd, success: false, timeout: true });
        }, 3000);
    });
}

async function testPaddleOCR(pythonCmd) {
    console.log(`\n2️⃣ Testando PaddleOCR com ${pythonCmd}...`);

    return new Promise((resolve) => {
        const test = spawn(pythonCmd, ['-c', 'import paddleocr; print("OK")']);
        let stdout = '';
        let stderr = '';

        test.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        test.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        test.on('close', (code) => {
            if (code === 0 && stdout.includes('OK')) {
                console.log('   ✅ PaddleOCR está instalado e funcionando!');
                resolve(true);
            } else {
                console.log('   ❌ PaddleOCR NÃO está instalado');
                if (stderr) {
                    console.log('   Erro:', stderr.substring(0, 200));
                }
                resolve(false);
            }
        });

        test.on('error', (err) => {
            console.log('   ❌ Erro ao executar:', err.message);
            resolve(false);
        });

        setTimeout(() => {
            test.kill();
            console.log('   ⏱️ Timeout - comando demorou muito');
            resolve(false);
        }, 10000);
    });
}

async function testPillowInstallation(pythonCmd) {
    console.log(`\n3️⃣ Testando Pillow...`);

    return new Promise((resolve) => {
        const test = spawn(pythonCmd, ['-c', 'from PIL import Image; print("OK")']);
        let stdout = '';
        let stderr = '';

        test.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        test.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        test.on('close', (code) => {
            if (code === 0 && stdout.includes('OK')) {
                console.log('   ✅ Pillow está instalado');
                resolve(true);
            } else {
                console.log('   ❌ Pillow NÃO está instalado');
                resolve(false);
            }
        });

        test.on('error', () => {
            resolve(false);
        });

        setTimeout(() => {
            test.kill();
            resolve(false);
        }, 5000);
    });
}

async function main() {
    // Testar todos os comandos Python
    for (const cmd of pythonCommands) {
        const result = await testPythonCommand(cmd);
        if (result.success) {
            pythonFound = true;

            // Testar PaddleOCR com este comando
            const paddleOK = await testPaddleOCR(cmd);
            if (paddleOK) {
                await testPillowInstallation(cmd);
            }

            console.log(`\n✅ Comando Python válido: ${cmd}`);
            break;
        } else {
            console.log(`   ❌ ${cmd}: não encontrado`);
        }
    }

    if (!pythonFound) {
        console.log('\n❌ Python não encontrado no sistema!');
        console.log('\n📥 Instale Python 3:');
        console.log('   Windows: https://www.python.org/downloads/');
        console.log('   Linux: sudo apt-get install python3');
        console.log('   Mac: brew install python3');
        return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔧 Testando função isConfigured() do paddleOCRWorker.js...\n');

    const paddleOCR = require('./paddleOCRWorker');
    const isConfigured = await paddleOCR.isConfigured();

    if (isConfigured) {
        console.log('✅ paddleOCR.isConfigured() retornou TRUE');
        console.log('   PaddleOCR deve aparecer disponível na interface!');
    } else {
        console.log('❌ paddleOCR.isConfigured() retornou FALSE');
        console.log('   Por isso a opção está desabilitada na interface.');
        console.log('\n🔍 Possíveis causas:');
        console.log('   1. Timeout muito curto (5 segundos)');
        console.log('   2. Comando Python incorreto');
        console.log('   3. Primeira execução do PaddleOCR (baixando modelos)');
    }

    console.log('='.repeat(60));
}

main().catch(console.error);
