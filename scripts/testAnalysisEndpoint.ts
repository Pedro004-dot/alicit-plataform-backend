#!/usr/bin/env tsx

/**
 * SCRIPT DE TESTE PARA A ROTA /edital/analysis
 * 
 * Este script testa especificamente a rota de análise para verificar
 * se está funcionando com o workflow sequencial.
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3002';

async function testAnalysisEndpoint() {
  console.log('🧪 Testando endpoint /edital/analysis');
  console.log('=====================================');
  
  const testPayload = {
    numeroControlePNCP: "TEST_LICITACAO_001",
    empresaCNPJ: "12345678000123"
  };
  
  try {
    console.log('📤 Enviando requisição POST para /edital/analysis');
    console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
    
    const startTime = Date.now();
    
    const response = await axios.post(
      `${API_BASE_URL}/edital/analysis`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 1 minuto
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n✅ RESPOSTA RECEBIDA');
    console.log('⏱️ Duração:', `${duration}ms`);
    console.log('🔢 Status HTTP:', response.status);
    console.log('📋 Response keys:', Object.keys(response.data));
    
    // Verificar estrutura da resposta
    const data = response.data;
    
    if (data.status) {
      console.log('📊 Status:', data.status);
    }
    
    if (data.licitacaoId) {
      console.log('🆔 Licitação ID:', data.licitacaoId);
    }
    
    if (data.finalReport) {
      console.log('📄 Relatório final encontrado:', data.finalReport.length, 'caracteres');
      console.log('📝 Prévia do relatório:');
      console.log('─'.repeat(50));
      console.log(data.finalReport.substring(0, 300) + '...');
      console.log('─'.repeat(50));
    }
    
    if (data.validationScore !== undefined) {
      console.log('🎯 Score de validação:', data.validationScore);
    }
    
    if (data.processedAt) {
      console.log('⏰ Processado em:', data.processedAt);
    }
    
    if (data.pdfPath) {
      console.log('📁 PDF gerado em:', data.pdfPath);
    }
    
    console.log('\n🎉 TESTE CONCLUÍDO - ENDPOINT FUNCIONANDO!');
    
  } catch (error: any) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    
    if (error.response) {
      console.error('📊 Status HTTP:', error.response.status);
      console.error('📋 Response data:', JSON.stringify(error.response.data, null, 2));
      
      // Análise do tipo de erro
      const errorData = error.response.data;
      
      if (errorData?.code === 'LICITACAO_NOT_FOUND') {
        console.log('\n💡 ANÁLISE: Este erro é esperado para licitações teste');
        console.log('✅ O endpoint está funcionando - apenas não encontrou os dados');
      }
      
      if (errorData?.code === 'DOCUMENTS_NOT_FOUND') {
        console.log('\n💡 ANÁLISE: Erro ao buscar documentos no PNCP');
        console.log('✅ O endpoint está funcionando - apenas não encontrou documentos');
      }
      
      if (errorData?.message?.includes('Pinecone')) {
        console.log('\n💡 ANÁLISE: Erro relacionado ao Pinecone não configurado');
        console.log('⚠️ Configure PINECONE_API_KEY para funcionalidade completa');
      }
      
    } else {
      console.error('🌐 Erro de rede ou timeout');
    }
    
    console.log('\n🔍 VERIFICAR:');
    console.log('1. Se o servidor está rodando na porta 3002');
    console.log('2. Se as variáveis de ambiente estão configuradas');
    console.log('3. Se o workflow está registrado no Mastra');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testAnalysisEndpoint();
}

export { testAnalysisEndpoint };