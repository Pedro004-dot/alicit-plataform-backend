import 'dotenv/config';
import { PineconeRepository } from '../repositories/pineconeRepository';

/**
 * Script para limpar TODOS os dados do Pinecone
 * ⚠️ CUIDADO: Este script apaga TODOS os vetores do índice!
 */
class PineconeCleaner {
  private pineconeRepo = new PineconeRepository();

  async clearAllData() {
    console.log('🚨 INICIANDO LIMPEZA COMPLETA DO PINECONE');
    console.log('⚠️  ATENÇÃO: Todos os vetores serão APAGADOS!');
    
    try {
      // Inicializar conexão
      console.log('🔄 Conectando ao Pinecone...');
      await this.pineconeRepo.initialize();
      console.log('✅ Conexão estabelecida');

      // Obter estatísticas antes da limpeza
      console.log('\n📊 ESTATÍSTICAS ANTES DA LIMPEZA:');
      const statsBefore = await this.pineconeRepo.getIndexStats();
      console.log(`📈 Total de vetores: ${statsBefore.totalVectorCount}`);
      console.log(`💾 Dimensões: ${statsBefore.dimension}`);
      
      if (statsBefore.totalVectorCount === 0) {
        console.log('✅ Índice já está vazio!');
        return;
      }

      // Confirmar limpeza
      console.log('\n🔥 INICIANDO LIMPEZA...');
      
      // Método 1: Deletar por namespace (se houver)
      console.log('🗑️  Tentando deletar por namespace...');
      try {
        await this.pineconeRepo.deleteAll();
        console.log('✅ Deletado via deleteAll()');
      } catch (error) {
        console.log('⚠️  deleteAll() não funcionou, tentando método alternativo...');
        
        // Método 2: Deletar todos os IDs conhecidos
        await this.deleteAllByIds();
      }

      // Aguardar propagação
      console.log('⏳ Aguardando propagação (10s)...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verificar estatísticas após limpeza
      console.log('\n📊 ESTATÍSTICAS APÓS LIMPEZA:');
      const statsAfter = await this.pineconeRepo.getIndexStats();
      console.log(`📈 Total de vetores: ${statsAfter.totalVectorCount}`);
      
      if (statsAfter.totalVectorCount === 0) {
        console.log('🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
        console.log('✅ Todos os vetores foram removidos');
      } else {
        console.log(`⚠️  Ainda restam ${statsAfter.totalVectorCount} vetores`);
        console.log('💡 Pode ser necessário aguardar mais tempo para propagação');
      }

    } catch (error) {
      console.error('❌ ERRO durante a limpeza:', error);
      throw error;
    }
  }

  private async deleteAllByIds() {
    console.log('🔍 Buscando todos os IDs para deletar...');
    
    try {
      // Buscar uma amostra grande para pegar IDs
      const sampleResults = await this.pineconeRepo.query({
        vector: new Array(1536).fill(0), // Vector dummy
        topK: 10000, // Máximo permitido
        includeMetadata: false,
        includeValues: false
      });

      if (sampleResults.matches && sampleResults.matches.length > 0) {
        const ids = sampleResults.matches.map((match: any) => match.id);
        console.log(`🎯 Encontrados ${ids.length} IDs para deletar`);
        
        // Deletar em batches
        const BATCH_SIZE = 1000;
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          console.log(`🗑️  Deletando batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(ids.length/BATCH_SIZE)} (${batch.length} IDs)`);
          
          await this.pineconeRepo.deleteByIds(batch);
          
          // Pausa entre batches
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('✅ Todos os IDs conhecidos foram deletados');
      } else {
        console.log('ℹ️  Nenhum ID encontrado via query');
      }
      
    } catch (error) {
      console.error('❌ Erro ao deletar por IDs:', error);
      throw error;
    }
  }
}

// Script executável
async function runPineconeClear() {
  const cleaner = new PineconeCleaner();
  
  console.log('🚨 SCRIPT DE LIMPEZA DO PINECONE');
  console.log('⚠️  Este script irá APAGAR TODOS os dados do Pinecone!');
  console.log('📋 Certifique-se de que é isso que você deseja fazer.\n');
  
  try {
    await cleaner.clearAllData();
    console.log('\n🎉 SCRIPT CONCLUÍDO COM SUCESSO!');
  } catch (error) {
    console.error('\n❌ SCRIPT FALHOU:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runPineconeClear();
}

export { PineconeCleaner, runPineconeClear };
