import pineconeLicitacaoRepository from '../repositories/pineconeLicitacaoRepository';

const testeID = async () => {
  try {
    console.log('Digite o ID PNCP da licitação que você encontrou:');
    
    // Teste com IDs que sabemos que existem
    const licitacoes = await pineconeLicitacaoRepository.getAllLicitacoes();
    console.log(`📊 Total de licitações: ${licitacoes.length}`);
    
    // Mostrar alguns IDs para teste
    console.log('\n📋 Primeiros 5 IDs disponíveis:');
    licitacoes.slice(0, 5).forEach((l, i) => {
      console.log(`${i+1}. ${l.numeroControlePNCP}`);
      console.log(`   Objeto: ${l.objetoCompra?.substring(0, 80)}...`);
    });
    
    // Buscar licitações com "galinhos" em qualquer campo
    console.log('\n🔍 Buscando "galinhos" em todos os campos...');
    const comGalinhos = licitacoes.filter(l => {
      const todosOsCampos = `
        ${l.objetoCompra || ''} 
        ${l.informacaoComplementar || ''} 
        ${l.orgaoEntidade?.razaoSocial || ''} 
        ${l.unidadeOrgao?.nomeUnidade || ''} 
        ${l.unidadeOrgao?.municipioNome || ''}
        ${l.itens?.map(item => item.descricao).join(' ') || ''}
      `.toLowerCase();
      
      return todosOsCampos.includes('galinhos');
    });
    
    console.log(`Encontradas: ${comGalinhos.length} licitações com "galinhos"`);
    
    comGalinhos.forEach((l, i) => {
      console.log(`\n${i+1}. ID: ${l.numeroControlePNCP}`);
      console.log(`   Objeto: ${l.objetoCompra?.substring(0, 100)}...`);
      console.log(`   Órgão: ${l.orgaoEntidade?.razaoSocial}`);
      console.log(`   Município: ${l.unidadeOrgao?.municipioNome}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

testeID();