#!/usr/bin/env tsx

/**
 * SCRIPT DE TESTE PARA VERIFICAR REGISTRO DO WORKFLOW
 * 
 * Este script verifica se o workflow sequentialAnalysisWorkflow
 * está registrado corretamente no Mastra.
 */

import { mastra } from '../src/mastra';

async function testWorkflowRegistration() {
  console.log('🧪 Testando registro do workflow sequentialAnalysisWorkflow');
  console.log('========================================================');
  
  try {
    // 1. Verificar se o Mastra foi importado corretamente
    console.log('1️⃣ Verificando instância do Mastra...');
    console.log('   ✅ Mastra importado com sucesso');
    
    // 2. Listar workflows registrados
    console.log('\n2️⃣ Listando workflows registrados...');
    const workflows = mastra.getWorkflows();
    const workflowNames = Object.keys(workflows);
    console.log('   📋 Workflows encontrados:', workflowNames);
    
    // 3. Verificar se o workflow específico existe
    console.log('\n3️⃣ Verificando workflow específico...');
    const targetWorkflow = 'sequentialAnalysisWorkflow';
    
    if (workflowNames.includes(targetWorkflow)) {
      console.log(`   ✅ Workflow '${targetWorkflow}' encontrado!`);
      
      // 4. Tentar obter o workflow
      console.log('\n4️⃣ Obtendo instância do workflow...');
      const workflow = mastra.getWorkflow(targetWorkflow);
      console.log('   ✅ Workflow obtido com sucesso');
      console.log('   🏷️ ID:', workflow.id);
      console.log('   📝 Descrição:', workflow.description);
      
      // 5. Verificar estrutura do workflow
      console.log('\n5️⃣ Verificando estrutura do workflow...');
      console.log('   📊 Schema de entrada definido:', !!workflow.inputSchema);
      console.log('   📊 Schema de saída definido:', !!workflow.outputSchema);
      
      // 6. Tentar criar um run (sem executar)
      console.log('\n6️⃣ Testando criação de run...');
      const run = await workflow.createRunAsync();
      console.log('   ✅ Run criado com sucesso');
      console.log('   🆔 Run criado');
      
      console.log('\n🎉 TODOS OS TESTES PASSARAM!');
      console.log('✅ O workflow está registrado e funcional');
      
    } else {
      console.log(`   ❌ Workflow '${targetWorkflow}' NÃO encontrado!`);
      console.log('   💡 Workflows disponíveis:', workflowNames);
      
      console.log('\n🔍 DIAGNÓSTICO:');
      console.log('❌ O workflow não está registrado corretamente');
      console.log('💡 Possíveis causas:');
      console.log('   - Erro na importação do workflow');
      console.log('   - Erro na configuração do Mastra');
      console.log('   - Nome do workflow incorreto');
    }
    
  } catch (error: any) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error('📋 Stack trace:', error.stack);
    
    console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Verificar se todas as dependências estão instaladas');
    console.log('2. Verificar se há erros de sintaxe nos arquivos do workflow');
    console.log('3. Verificar se as importações estão corretas');
    console.log('4. Verificar se o banco de dados SQLite está acessível');
  }
}

// Teste adicional para agentes
async function testAgentsRegistration() {
  console.log('\n🤖 Testando registro dos agentes...');
  console.log('===================================');
  
  try {
    const agents = mastra.getAgents();
    const agentNames = Object.keys(agents);
    console.log('📋 Agentes registrados:', agentNames);
    
    const expectedAgents = [
      'strategicFitAgent',
      'operationalAgent', 
      'legalDocAgent',
      'financialAgent'
    ];
    
    const missingAgents = expectedAgents.filter(agent => !agentNames.includes(agent));
    
    if (missingAgents.length === 0) {
      console.log('✅ Todos os agentes necessários estão registrados');
    } else {
      console.log('❌ Agentes faltando:', missingAgents);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar agentes:', error);
  }
}

// Executar testes
async function runTests() {
  await testWorkflowRegistration();
  await testAgentsRegistration();
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests();
}

export { testWorkflowRegistration, testAgentsRegistration };