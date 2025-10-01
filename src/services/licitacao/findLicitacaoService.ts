import pineconeLicitacaoRepository from '../../repositories/pineconeLicitacaoRepository';
import { calculateMatchingScore, EmpresaPerfil, PNCPLicitacao, MatchResult } from './metrics';
import { clearCoordenadasCache, clearCidadesRaioCache } from './geolocation';
import { aplicarFiltrosAtivos } from './filters';

interface FindRequest {
  cnpj: string;
  palavraChave: string;
  valorMinimo?: number;
  valorMaximo?: number;
  valorMinimoUnitario?: number;
  valorMaximoUnitario?: number;
  tipoLicitacao?: string;
  dataInicio?: string;
  dataFim?: string;
  fonte?: string;
  raioDistancia?: number;
  cidade_radar?: string;
}


const findWithKeywordAndFilters = async (findRequest: FindRequest): Promise<PNCPLicitacao[]> => {
  try {
    console.log(`🔍 Iniciando busca: "${findRequest.palavraChave}"`);
    
    // Buscar todas as licitações
    const licitacoes = await pineconeLicitacaoRepository.getAllLicitacoes();
    console.log(`📊 Total de licitações na base: ${licitacoes.length}`);
    
    // NOVA ESTRATÉGIA: Verificar se é busca por ID PNCP
    const isIdPNCP = isPNCPId(findRequest.palavraChave);
    console.log(`🎯 Tipo de busca: ${isIdPNCP ? 'ID PNCP' : 'Texto'}`);
    
    let licitacoesFiltradas: any[] = [];
    
    if (isIdPNCP) {
      // BUSCA POR ID PNCP
      licitacoesFiltradas = licitacoes.filter(licitacao => 
        licitacao.numeroControlePNCP === findRequest.palavraChave
      );
      console.log(`📋 Busca por ID PNCP "${findRequest.palavraChave}": ${licitacoesFiltradas.length} encontradas`);
    }
    
    // Se não encontrou por ID ou não é ID, busca por texto
    if (licitacoesFiltradas.length === 0) {
      console.log(`🔤 Executando busca textual...`);
      licitacoesFiltradas = licitacoes.filter(licitacao => {
        // Campos principais da licitação
        const textoCompleto = `${licitacao.objetoCompra || ''} ${licitacao.informacaoComplementar || ''}`.toLowerCase();
      
        const itensTexto = licitacao.itens?.map(item => 
          `${item.descricao || ''} ${item.materialOuServicoNome || ''}`
        ).join(' ').toLowerCase() || '';
        
        // NOVO: Adicionar numeroControlePNCP na busca textual também
        const numeroControl = licitacao.numeroControlePNCP || '';
        
        // Buscar em todos os textos combinados + ID
        const todosTextos = `${textoCompleto} ${itensTexto} ${numeroControl}`;
        return todosTextos.includes(findRequest.palavraChave.toLowerCase());
      });
      console.log(`📝 Busca textual: ${licitacoesFiltradas.length} encontradas`);
    }
    
    // Criar perfil empresa para usar filtros existentes
    const empresaPerfil: EmpresaPerfil = {  
      cnpj: findRequest.cnpj,
      termosInteresse: [findRequest.palavraChave],
      valorMinimo: findRequest.valorMinimo,
      valorMaximo: findRequest.valorMaximo,
      valorMinimoUnitario: findRequest.valorMinimoUnitario,
      valorMaximoUnitario: findRequest.valorMaximoUnitario,
      raioRadar: findRequest.raioDistancia,
      cidadeRadar: findRequest.cidade_radar,
    };
    
    // Aplicar filtros usando função existente
    const resultadoFiltros = await aplicarFiltrosAtivos(licitacoesFiltradas, empresaPerfil);

    console.log(`✅ Busca manual concluída: ${resultadoFiltros.licitacoesFiltradas.length} resultados finais`);
    return resultadoFiltros.licitacoesFiltradas;
 
    
  } catch (error) {
    console.error('❌ Erro na busca manual:', error);
    return [];
  }
};

// Função auxiliar para detectar se é um ID PNCP
const isPNCPId = (texto: string): boolean => {
  // IDs PNCP geralmente são números longos ou códigos alfanuméricos
  // Exemplos: "2023001234567890", "20230012345", etc.
  const textoLimpo = texto.trim();
  
  // Critérios para considerar como ID PNCP:
  // 1. Só números com mais de 10 dígitos
  // 2. Ou código alfanumérico específico do PNCP
  const somenteNumeros = /^\d{10,}$/.test(textoLimpo);
  const formatoPNCP = /^[A-Z0-9]{10,}$/i.test(textoLimpo);
  
  return somenteNumeros || formatoPNCP;
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