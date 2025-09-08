#!/usr/bin/env tsx

/**
 * SCRIPT DE TESTE PARA ROTA /analysis
 * 
 * Este script testa se a rota de análise está configurada corretamente
 * e se está integrando com o workflow sequencial.
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002';

interface TestAnalysisRequest {
  numeroControlePNCP: string;
  empresaCNPJ?: string;
}

interface TestAnalysisResponse {
  status: "processing" | "completed" | "error";
  licitacaoId: string;
  processedAt: string;
  pdfPath?: string;
  technicalSummary: string;
  impugnacaoAnalysis: string;
  finalReport: string;
  validationScore: number;
}

async function testAnalysisRoute() {
  console.log('🧪 Iniciando teste da rota /analysis');
  console.log('📍 URL base:', API_BASE_URL);
  
  // Dados de teste
  const testRequest: TestAnalysisRequest = {
    numeroControlePNCP: "04278818000121-1-000018-2025",
    empresaCNPJ: "12345678000123" // CNPJ de teste
  };
  
  try {
    console.log('\n🚀 Enviando requisição para /edital/analysis...');
    console.log('📦 Payload:', JSON.stringify(testRequest, null, 2));
    
    const startTime = Date.now();
    
    const response = await axios.post<TestAnalysisResponse>(
      `${API_BASE_URL}/edital/analysis`,
      testRequest,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 300000, // 5 minutos timeout
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n✅ RESPOSTA RECEBIDA');
    console.log('⏱️ Duração:', `${duration}ms (${(duration/1000).toFixed(2)}s)`);
    console.log('🔢 Status HTTP:', response.status);
    console.log('📊 Status da análise:', response.data.status);
    console.log('🆔 Licitação ID:', response.data.licitacaoId);
    console.log('📅 Processado em:', response.data.processedAt);
    console.log('📄 PDF gerado:', response.data.pdfPath ? 'Sim' : 'Não');
    console.log('🎯 Score de validação:', response.data.validationScore);
    
    // Verificar se os campos essenciais estão presentes
    const requiredFields = ['status', 'licitacaoId', 'processedAt', 'finalReport'];
    const missingFields = requiredFields.filter(field => !response.data[field as keyof TestAnalysisResponse]);
    
    if (missingFields.length > 0) {
      console.log('\n⚠️ CAMPOS OBRIGATÓRIOS FALTANDO:', missingFields);
    } else {
      console.log('\n✅ Todos os campos obrigatórios presentes');
    }
    
    // Mostrar prévia do relatório final
    if (response.data.finalReport) {
      console.log('\n📋 PRÉVIA DO RELATÓRIO FINAL:');
      console.log('─'.repeat(50));
      console.log(response.data.finalReport.substring(0, 500) + '...');
      console.log('─'.repeat(50));
    }
    
    // Mostrar prévia do resumo técnico
    if (response.data.technicalSummary) {
      console.log('\n🔧 PRÉVIA DO RESUMO TÉCNICO:');
      console.log(response.data.technicalSummary.substring(0, 200) + '...');
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
    
  } catch (error: any) {
    console.error('\n❌ ERRO NO TESTE:');
    
    if (error.response) {
      // Erro da API
      console.error('📊 Status HTTP:', error.response.status);
      console.error('💬 Mensagem:', error.response.data?.message || 'Sem mensagem');
      console.error('🏷️ Código:', error.response.data?.code || 'Sem código');
      console.error('📋 Dados completos:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Erro de rede
      console.error('🌐 Erro de rede - servidor não respondeu');
      console.error('🔗 Verifique se o servidor está rodando na porta 3002');
    } else {
      // Outros erros
      console.error('🔧 Erro de configuração:', error.message);
    }
    
    console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Verifique se o servidor backend está rodando (npm run dev)');
    console.log('2. Confirme se as variáveis de ambiente estão configuradas');
    console.log('3. Verifique se o Pinecone está configurado corretamente');
    console.log('4. Teste com uma licitação que já tenha dados processados');
  }
}

// Teste de conectividade básica
async function testServerConnectivity() {
  try {
    console.log('🔍 Testando conectividade com o servidor...');
    const response = await axios.get(`${API_BASE_URL}/`);
    console.log('✅ Servidor respondendo:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Servidor não está respondendo');
    return false;
  }
}

// Executar testes
async function runTests() {
  console.log('🧪 SCRIPT DE TESTE - ROTA /analysis');
  console.log('=====================================');
  
  // Teste de conectividade primeiro
  const serverUp = await testServerConnectivity();
  
  if (!serverUp) {
    console.log('❌ Não é possível continuar - servidor offline');
    process.exit(1);
  }
  
  // Teste principal
  await testAnalysisRoute();
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests();
}

export { testAnalysisRoute, testServerConnectivity };