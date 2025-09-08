#!/usr/bin/env tsx

/**
 * TESTE SIMPLES DO WORKFLOW SEM DEPENDÊNCIAS EXTERNAS
 * 
 * Este script testa apenas o workflow sem inicializar dependências
 * como Pinecone ou Supabase que podem não estar configuradas.
 */

async function testBasicWorkflowStructure() {
  console.log('🧪 Teste básico da estrutura do workflow');
  console.log('==========================================');
  
  try {
    // Importar apenas a definição do workflow
    const { sequentialAnalysisWorkflow } = await import('../src/mastra/workflows/sequentialAnalysisWorkflowSimplified');
    
    console.log('1️⃣ Workflow importado com sucesso');
    console.log('   🏷️ ID:', sequentialAnalysisWorkflow.id);
    console.log('   📝 Descrição:', sequentialAnalysisWorkflow.description);
    
    // Verificar schemas
    if (sequentialAnalysisWorkflow.inputSchema) {
      console.log('2️⃣ Schema de entrada encontrado');
      console.log('   📊 Tipo:', typeof sequentialAnalysisWorkflow.inputSchema);
    } else {
      console.log('2️⃣ ❌ Schema de entrada não encontrado');
    }
    
    if (sequentialAnalysisWorkflow.outputSchema) {
      console.log('3️⃣ Schema de saída encontrado');
      console.log('   📊 Tipo:', typeof sequentialAnalysisWorkflow.outputSchema);
    } else {
      console.log('3️⃣ ❌ Schema de saída não encontrado');
    }
    
    console.log('\n✅ ESTRUTURA DO WORKFLOW VALIDADA');
    console.log('O workflow está definido corretamente');
    
  } catch (error: any) {
    console.error('\n❌ ERRO AO IMPORTAR WORKFLOW:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

async function testAgentsImport() {
  console.log('\n🤖 Teste de importação dos agentes');
  console.log('==================================');
  
  try {
    const { sequentialAgents } = await import('../src/mastra/agents/sequential');
    
    const agentNames = Object.keys(sequentialAgents);
    console.log('📋 Agentes importados:', agentNames);
    
    const expectedAgents = [
      'strategicFitAgent',
      'operationalAgent', 
      'legalDocAgent',
      'financialAgent'
    ];
    
    const missingAgents = expectedAgents.filter(agent => !agentNames.includes(agent));
    
    if (missingAgents.length === 0) {
      console.log('✅ Todos os agentes necessários foram importados');
    } else {
      console.log('❌ Agentes faltando:', missingAgents);
    }
    
    // Verificar estrutura de cada agente
    for (const [name, agent] of Object.entries(sequentialAgents)) {
      console.log(`   🤖 ${name}:`, typeof agent);
    }
    
  } catch (error: any) {
    console.error('\n❌ ERRO AO IMPORTAR AGENTES:', error.message);
  }
}

async function runTests() {
  await testBasicWorkflowStructure();
  await testAgentsImport();
  
  console.log('\n🎯 CONCLUSÃO');
  console.log('===========');
  console.log('Se não houve erros acima, a estrutura básica está correta.');
  console.log('Para teste completo, configure as variáveis de ambiente:');
  console.log('- PINECONE_API_KEY');
  console.log('- OPENAI_API_KEY');
  console.log('- SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests();
}

export { testBasicWorkflowStructure, testAgentsImport };