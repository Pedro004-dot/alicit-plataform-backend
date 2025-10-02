import 'dotenv/config';
import pineconeLicitacaoRepository from '../repositories/pineconeLicitacaoRepository';

async function consultarEstruturaPinecone() {
  try {
    console.log('🔍 DIAGNÓSTICO DA ESTRUTURA DO PINECONE\n');
    
    // 1. Estatísticas do índice
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const index = pinecone.index('alicit-editais');
    
    const stats = await index.describeIndexStats();
    console.log('📊 ESTATÍSTICAS DO ÍNDICE:');
    console.log(`   Total de vetores: ${stats.namespaces?.['']?.recordCount || 0}`);
    console.log(`   Dimensões: ${stats.dimension}`);
    console.log(`   Status: ${JSON.stringify(stats, null, 2)}\n`);
    
    // 2. Buscar amostra de registros
    console.log('📋 AMOSTRAS DE REGISTROS:');
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0.1),
      topK: 2,
      includeValues: false,
      includeMetadata: true,
      filter: { numeroControlePNCP: { $exists: true } }
    });
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      queryResponse.matches.forEach((match, idx) => {
        console.log(`\n--- REGISTRO ${idx + 1} ---`);
        console.log(`ID: ${match.id}`);
        console.log(`Score: ${match.score}`);
        console.log(`Metadata keys: [${Object.keys(match.metadata || {}).join(', ')}]`);
        
        if (match.metadata) {
          console.log('\n📝 METADATA COMPLETA:');
          Object.entries(match.metadata).forEach(([key, value]) => {
            if (key === 'data') {
              // Parse e mostra estrutura da licitação
              try {
                const licitacao = JSON.parse(value as string);
                console.log(`   ${key}: {JSON com ${Object.keys(licitacao).length} campos}`);
                console.log(`      numeroControlePNCP: ${licitacao.numeroControlePNCP}`);
                console.log(`      objetoCompra: ${(licitacao.objetoCompra || '').substring(0, 100)}...`);
                console.log(`      itens: ${licitacao.itens?.length || 0} itens`);
                console.log(`      orgaoEntidade: ${licitacao.orgaoEntidade?.razaoSocial || 'N/A'}`);
              } catch (e) {
                console.log(`   ${key}: [Erro ao parsear JSON]`);
              }
            } else {
              const valueStr = typeof value === 'string' && value.length > 100 
                ? value.substring(0, 100) + '...' 
                : String(value);
              console.log(`   ${key}: ${valueStr}`);
            }
          });
        }
      });
    } else {
      console.log('❌ Nenhum registro encontrado');
    }
    
    // 3. Analisar estrutura dos campos
    console.log('\n🏗️ ANÁLISE DA ESTRUTURA DE METADATA:');
    const allFields = new Set<string>();
    
    if (queryResponse.matches) {
      queryResponse.matches.forEach(match => {
        if (match.metadata) {
          Object.keys(match.metadata).forEach(key => allFields.add(key));
        }
      });
    }
    
    console.log(`Campos encontrados: [${Array.from(allFields).join(', ')}]`);
    
    // 4. Testar busca por ID específico
    console.log('\n🎯 TESTE DE BUSCA POR ID:');
    try {
      const testeId = queryResponse.matches?.[0]?.metadata?.numeroControlePNCP as string;
      if (testeId) {
        console.log(`Testando busca do ID: ${testeId}`);
        const licitacao = await pineconeLicitacaoRepository.getLicitacao(testeId);
        console.log(`Resultado: ${licitacao ? '✅ Encontrado' : '❌ Não encontrado'}`);
        if (licitacao) {
          console.log(`   Objeto: ${licitacao.objetoCompra?.substring(0, 100)}...`);
          console.log(`   Itens: ${licitacao.itens?.length || 0}`);
        }
      }
    } catch (error) {
      console.log(`❌ Erro no teste: ${error}`);
    }
    
    // 5. Testar getAllLicitacoes (limitado)
    console.log('\n📊 TESTE DE getAllLicitacoes:');
    const todasLicitacoes = await pineconeLicitacaoRepository.getAllLicitacoes();
    console.log(`Total carregado: ${todasLicitacoes.length} licitações`);
    
    if (todasLicitacoes.length > 0) {
      const primeira = todasLicitacoes[0];
      console.log(`Primeira licitação: ${primeira.numeroControlePNCP}`);
      console.log(`Com itens: ${primeira.itens?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  consultarEstruturaPinecone();
}

export { consultarEstruturaPinecone };