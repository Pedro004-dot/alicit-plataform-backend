import pineconeLicitacaoRepository from '../repositories/pineconeLicitacaoRepository';

const testeBusca = async () => {
  try {
    console.log('🔍 Buscando todas as licitações...');
    const licitacoes = await pineconeLicitacaoRepository.getAllLicitacoes();
    console.log(`📊 Total de licitações: ${licitacoes.length}`);
    
    const textoTest = "OBTENÇÃO DE REGISTRO DE PREÇOS PARA FUTURA E EVENTUAL CONTRATAÇÃO DE SERVIÇO DE DIGITALIZAÇÃO DE DOCUMENTOS COM FORNECIMENTO DE MÃO DE OBRA ESPECIALIZADA PARA OPERACIONALIZAÇÃO, DIGITALIZAÇÃO, INDEXAÇÃO DE DOCUMENTOS DA PREFEITURA MUNICIPAL DE GALINHOS/RN";
    
    console.log('\n🔎 Procurando licitação específica...');
    console.log('Texto:', textoTest);
    
    // Testar busca exata
    const encontradaExata = licitacoes.find(l => 
      l.objetoCompra?.includes("DIGITALIZAÇÃO DE DOCUMENTOS") && 
      l.objetoCompra?.includes("GALINHOS")
    );
    
    if (encontradaExata) {
      console.log('\n✅ ENCONTRADA!');
      console.log('ID:', encontradaExata.numeroControlePNCP);
      console.log('Objeto:', encontradaExata.objetoCompra?.substring(0, 200) + '...');
      console.log('Órgão:', encontradaExata.orgaoEntidade?.razaoSocial);
      console.log('Município:', encontradaExata.unidadeOrgao?.municipioNome);
    } else {
      console.log('\n❌ NÃO ENCONTRADA com busca específica');
      
      // Buscar por partes
      const comDigitalizacao = licitacoes.filter(l => 
        l.objetoCompra?.toLowerCase().includes('digitalização') ||
        l.objetoCompra?.toLowerCase().includes('digitalizacao')
      );
      
      console.log(`📋 Licitações com "digitalização": ${comDigitalizacao.length}`);
      comDigitalizacao.slice(0, 3).forEach((l, i) => {
        console.log(`${i+1}. ${l.numeroControlePNCP} - ${l.objetoCompra?.substring(0, 100)}...`);
      });
      
      const comGalinhos = licitacoes.filter(l => 
        l.objetoCompra?.toLowerCase().includes('galinhos') ||
        l.orgaoEntidade?.razaoSocial?.toLowerCase().includes('galinhos') ||
        l.unidadeOrgao?.municipioNome?.toLowerCase().includes('galinhos')
      );
      
      console.log(`🏛️ Licitações com "galinhos": ${comGalinhos.length}`);
      comGalinhos.slice(0, 3).forEach((l, i) => {
        console.log(`${i+1}. ${l.numeroControlePNCP} - ${l.objetoCompra?.substring(0, 100)}...`);
        console.log(`   Órgão: ${l.orgaoEntidade?.razaoSocial}`);
        console.log(`   Município: ${l.unidadeOrgao?.municipioNome}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

testeBusca();