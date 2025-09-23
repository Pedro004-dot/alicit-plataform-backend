import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';
import { calculateMatchingScore, EmpresaPerfil, PNCPLicitacao, MatchResult } from './metrics';
import { clearCoordenadasCache, clearCidadesRaioCache } from './geolocation';
import { aplicarFiltrosAtivos } from './filters';

interface FindRequest {
  cnpj: string;
  palavraChave: string;
  valorMinimo?: number;
  valorMaximo?: number;
  tipoLicitacao?: string;
  dataInicio?: string;
  dataFim?: string;
  fonte?: string;
  raioDistancia?: number;
  cidade_radar?: string;
}


const findWithKeywordAndFilters = async (findRequest: FindRequest): Promise<PNCPLicitacao[]> => {
  try {
    // Buscar todas as licitações
    const licitacoes = await pineconeLicitacaoRepository.getAllLicitacoes()
    
    // Filtrar por palavra-chave - busca em todos os campos relevantes
    const licitacoesFiltradas = licitacoes.filter(licitacao => {
      // Campos principais da licitação
      const textoCompleto = `${licitacao.objetoCompra || ''} ${licitacao.informacaoComplementar || ''}`.toLowerCase();
    
      const itensTexto = licitacao.itens?.map(item => 
        `${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.descricao|| ''} ${item.descricao || ''}`
      ).join(' ').toLowerCase() || '';
      
      // Buscar em todos os textos combinados
      const todosTextos = `${textoCompleto} ${itensTexto}`;
      return todosTextos.includes(findRequest.palavraChave.toLowerCase());
    });
    
    // Criar perfil empresa para usar filtros existentes
    const empresaPerfil: EmpresaPerfil = {  
      cnpj: findRequest.cnpj,
      termosInteresse: [findRequest.palavraChave],
      valorMinimo: findRequest.valorMinimo,
      valorMaximo: findRequest.valorMaximo,
      raioDistancia: findRequest.raioDistancia,
      cidadeRadar: findRequest.cidade_radar,
    };
    
    // Aplicar filtros usando função existente
    const resultadoFiltros = await aplicarFiltrosAtivos(licitacoesFiltradas, empresaPerfil);

    // console.log(`✅ Busca manual concluída: ${resultadoFiltros.licitacoesFiltradas.length} resultados finais`);
    return resultadoFiltros.licitacoesFiltradas;
 
    
  } catch (error) {
    console.error('❌ Erro na busca manual:', error);
    return [];
  }
};

const clearGeographicCache = () => {
  clearCoordenadasCache();
  clearCidadesRaioCache();
  console.log('🧹 Cache geográfico limpo');
};

export default { 
  findWithKeywordAndFilters,
  clearCache: pineconeLicitacaoRepository.clearAllCaches,
  clearGeographicCache
};