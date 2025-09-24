import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function testPDFShiftAPI() {
  console.log('🧪 Testando PDFShift API...\n');

  const API_KEY = process.env.PDFSHIFT_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ PDFSHIFT_API_KEY não configurada!');
    console.log('Configure a variável de ambiente PDFSHIFT_API_KEY');
    process.exit(1);
  }

  console.log('✅ API Key encontrada:', API_KEY.substring(0, 10) + '...');

  // HTML simples para teste
  const testHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Teste PDFShift - Alicit</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
            background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%);
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #ff6b35;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 20px;
        }
        .content {
            line-height: 1.6;
        }
        .highlight {
            background: #fff4f0;
            padding: 15px;
            border-left: 4px solid #ff6b35;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 TESTE PDFSHIFT API</h1>
            <p>Sistema ALICIT - Geração de PDF</p>
        </div>
        
        <div class="content">
            <h2>Teste de Conversão HTML → PDF</h2>
            
            <p>Este é um teste para verificar se a API PDFShift está funcionando corretamente.</p>
            
            <div class="highlight">
                <strong>✅ Características testadas:</strong>
                <ul>
                    <li>Conversão de HTML para PDF</li>
                    <li>Suporte a CSS e backgrounds</li>
                    <li>Formatação A4 com margens</li>
                    <li>Cores e gradientes</li>
                </ul>
            </div>
            
            <h3>Informações do Teste</h3>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Formato:</strong> A4</p>
            <p><strong>Margens:</strong> 20mm (top/bottom), 15mm (left/right)</p>
            
            <div style="background: #e8f5e8; padding: 10px; border-radius: 4px; margin-top: 20px;">
                <p><strong>🎯 Objetivo:</strong> Validar integração com PDFShift para relatórios ALICIT</p>
            </div>
        </div>
    </div>
</body>
</html>`;

  // Configurações de teste - versão básica
  const basicConfig = {
    source: testHTML,
    format: 'A4',
    landscape: false
  };

  // Configurações de teste - versão completa
  const fullConfig = {
    source: testHTML,
    format: 'A4',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    landscape: false,
    use_print: true,
    disable_backgrounds: false
  };

  const tests = [
    { name: 'Teste Básico', config: basicConfig },
    { name: 'Teste Completo', config: fullConfig }
  ];

  for (const test of tests) {
    console.log(`\n📋 Executando: ${test.name}`);
    console.log('Parâmetros:', JSON.stringify(test.config, null, 2));

    try {
      const response = await axios.post('https://api.pdfshift.io/v3/convert/pdf', test.config, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${API_KEY}`).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 30000 // 30 segundos timeout
      });

      // Salvar PDF de teste
      const filename = `teste-pdfshift-${test.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      const outputPath = path.join(__dirname, '../../reports', filename);
      
      // Criar diretório se não existir
      const reportsDir = path.dirname(outputPath);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, response.data);
      
      console.log(`✅ ${test.name} - SUCESSO!`);
      console.log(`📄 PDF salvo em: ${outputPath}`);
      console.log(`📊 Tamanho: ${(response.data.length / 1024).toFixed(2)} KB`);

    } catch (error: any) {
      console.log(`❌ ${test.name} - ERRO!`);
      
      if (error.response?.data && Buffer.isBuffer(error.response.data)) {
        try {
          const errorText = error.response.data.toString('utf-8');
          console.log('🔍 Erro detalhado:', errorText);
        } catch (parseError) {
          console.log('🔍 Erro (raw):', error.response.data);
        }
      } else {
        console.log('🔍 Erro:', error.response?.data || error.message);
      }

      console.log(`🔍 Status Code: ${error.response?.status}`);
      console.log(`🔍 Headers: ${JSON.stringify(error.response?.headers, null, 2)}`);
    }
  }

  console.log('\n🏁 Teste finalizado!');
}

// Executar teste
testPDFShiftAPI().catch(error => {
  console.error('❌ Erro fatal no teste:', error);
  process.exit(1);
});