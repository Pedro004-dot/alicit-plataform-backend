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
    
    // 🎯 ESTRATÉGIA HÍBRIDA INTELIGENTE
    const isIdPNCP = isPNCPId(findRequest.palavraChave);
    console.log(`🎯 Tipo de busca detectado: ${isIdPNCP ? 'ID PNCP' : 'Texto'}`);
    
    let licitacoesFiltradas: any[] = [];
    let estrategiaUsada = '';
    
    if (isIdPNCP) {
      // 1️⃣ BUSCA DIRETA VIA PINECONE (evita limite de 10k do getAllLicitacoes)
      console.log(`🎯 Executando busca direta no Pinecone por ID: "${findRequest.palavraChave}"`);
      
      try {
        const licitacaoDirecta = await pineconeLicitacaoRepository.getLicitacao(findRequest.palavraChave);
        if (licitacaoDirecta) {
          licitacoesFiltradas = [licitacaoDirecta];
          estrategiaUsada = 'Busca direta no Pinecone por ID';
          console.log(`✅ Licitação encontrada diretamente: ${licitacaoDirecta.numeroControlePNCP}`);
        } else {
          console.log(`❌ ID não encontrado no Pinecone: ${findRequest.palavraChave}`);
        }
      } catch (error) {
        console.error('❌ Erro na busca direta:', error);
      }
      
      // 🔄 FALLBACK 1: Se não encontrou diretamente, tentar busca parcial via getAllLicitacoes
      if (licitacoesFiltradas.length === 0) {
        console.log(`🔄 Fallback: Busca parcial no ID via getAllLicitacoes...`);
        licitacoesFiltradas = licitacoes.filter(licitacao => 
          licitacao.numeroControlePNCP?.includes(findRequest.palavraChave)
        );
        estrategiaUsada = 'Busca parcial por ID (fallback)';
        console.log(`📋 Resultado busca parcial: ${licitacoesFiltradas.length} licitações encontradas`);
      }
    }
    
    // 2️⃣ BUSCA TEXTUAL (quando não é ID ou quando ID não encontrou nada)
    if (licitacoesFiltradas.length === 0) {
      console.log(`🔤 Executando busca textual em getAllLicitacoes...`);
      const palavraChaveLower = findRequest.palavraChave.toLowerCase();
      
      licitacoesFiltradas = licitacoes.filter(licitacao => {
        // Campos de texto principais
        const objetoCompra = (licitacao.objetoCompra || '').toLowerCase();
        const informacaoComplementar = (licitacao.informacaoComplementar || '').toLowerCase();
        
        // Texto dos itens
        const itensTexto = licitacao.itens?.map(item => 
          `${item.descricao || ''} ${item.materialOuServicoNome || ''} ${item.itemCategoriaNome || ''}`
        ).join(' ').toLowerCase() || '';
        
        // Dados do órgão
        const orgaoTexto = `${licitacao.orgaoEntidade?.razaoSocial || ''} ${licitacao.unidadeOrgao?.nomeUnidade || ''}`.toLowerCase();
        
        // ID PNCP também pode ser buscado como texto
        const numeroControl = (licitacao.numeroControlePNCP || '').toLowerCase();
        
        // Modalidade e situação
        const metadados = `${licitacao.modalidadeNome || ''} ${licitacao.situacaoCompraNome || ''}`.toLowerCase();
        
        // 🔍 BUSCA EM MÚLTIPLOS CAMPOS
        const camposPrincipais = `${objetoCompra} ${informacaoComplementar}`;
        const todosOsCampos = `${camposPrincipais} ${itensTexto} ${orgaoTexto} ${numeroControl} ${metadados}`;
        
        return todosOsCampos.includes(palavraChaveLower);
      });
      
      console.log(`📝 Resultado busca textual getAllLicitacoes: ${licitacoesFiltradas.length} licitações encontradas`);
      
      // 🚀 FALLBACK SEMÂNTICO: Se não encontrou nada, buscar diretamente no Pinecone
      if (licitacoesFiltradas.length === 0) {
        console.log(`🔍 Fallback: Busca semântica direta no Pinecone...`);
        try {
          const resultadosSemanticos = await buscarSemanticamenteNoPinecone(findRequest.palavraChave);
          licitacoesFiltradas = resultadosSemanticos;
          estrategiaUsada = 'Busca semântica direta no Pinecone (fallback)';
          console.log(`🎯 Resultado busca semântica: ${licitacoesFiltradas.length} licitações encontradas`);
        } catch (error) {
          console.error('❌ Erro na busca semântica:', error);
          estrategiaUsada = isIdPNCP ? 'Busca textual (fallback do ID)' : 'Busca textual';
        }
      } else {
        estrategiaUsada = isIdPNCP ? 'Busca textual (fallback do ID)' : 'Busca textual';
      }
    }
    
    console.log(`✅ Estratégia final utilizada: ${estrategiaUsada}`);
    
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
  const textoLimpo = texto.trim();
  
  // VERSÃO REFINADA: Mais precisa para evitar falsos positivos
  // Exemplos reais: "27142058000126-1-000518/2025", "2023001234567890", etc.
  
  // 1. Números puros com 10+ dígitos (IDs numéricos)
  const somenteNumeros = /^\d{10,}$/.test(textoLimpo);
  
  // 2. Padrão específico do PNCP: CNPJ-modalidade-numero/ano (mais restritivo)
  const padraoEspecifico = /^\d{14}-\d+-\d+\/\d{4}$/i.test(textoLimpo);
  
  // 3. Outros padrões com números e caracteres especiais (mais de 70% números)
  const temMuitosNumeros = (textoLimpo.match(/\d/g) || []).length / textoLimpo.length > 0.7;
  const temCaracteresEspeciais = /[\-\/\.]/.test(textoLimpo);
  const formatoGovernoComNumeros = temMuitosNumeros && temCaracteresEspeciais && textoLimpo.length >= 10;
  
  const isId = somenteNumeros || padraoEspecifico || formatoGovernoComNumeros;
  
  if (isId) {
    console.log(`🎯 ID PNCP detectado: "${textoLimpo}" (padrão: ${
      somenteNumeros ? 'números puros' : 
      padraoEspecifico ? 'CNPJ-modalidade-numero/ano' : 
      'formato governo com números'
    })`);
  } else {
    console.log(`📝 Texto detectado (não é ID): "${textoLimpo}"`);
  }
  
  return isId;
};

// Função para busca semântica direta no Pinecone (fallback para casos como limite de 10k)
const buscarSemanticamenteNoPinecone = async (textoBusca: string): Promise<PNCPLicitacao[]> => {
  try {
    console.log(`🧠 Gerando embedding para: "${textoBusca.substring(0, 50)}..."`);
    
    // Gerar embedding para o texto de busca
    let searchVector: number[];
    
    if (process.env.OPENAI_API_KEY) {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textoBusca,
        encoding_format: 'float',
      });
      
      searchVector = embeddingResponse.data[0].embedding;
      console.log(`✅ Embedding OpenAI gerado: ${searchVector.length} dimensões`);
    } else {
      // Fallback para vector hash-based se OpenAI não configurado
      searchVector = generateHashBasedVector(textoBusca);
      console.log(`⚠️ Usando embedding hash-based (OpenAI não configurado)`);
    }
    
    // Buscar no Pinecone usando o embedding
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const index = pinecone.index('alicit-editais');
    
    console.log(`🔍 Buscando semanticamente no Pinecone...`);
    const queryResponse = await index.query({
      vector: searchVector,
      topK: 100, // Buscar mais resultados para compensar possíveis filtros
      includeValues: false,
      includeMetadata: true,
      filter: { numeroControlePNCP: { $exists: true } }
    });
    
    const licitacoes: PNCPLicitacao[] = [];
    
    for (const match of queryResponse.matches || []) {
      if (match.metadata?.data && match.score && match.score > 0.5) { // Filtro de relevância (reduzido para captar mais resultados)
        try {
          const licitacao = JSON.parse(match.metadata.data as string) as PNCPLicitacao;
          if (licitacao.itens?.length > 0) {
            licitacoes.push(licitacao);
          }
        } catch (error) {
          console.warn('Erro ao parsear licitação da busca semântica:', error);
        }
      }
    }
    
    console.log(`🎯 Busca semântica retornou: ${licitacoes.length} licitações relevantes`);
    return licitacoes;
    
  } catch (error) {
    console.error('❌ Erro na busca semântica:', error);
    return [];
  }
};

// Função auxiliar para gerar vector baseado em hash (fallback)
const generateHashBasedVector = (text: string): number[] => {
  const vector = new Array(1536);
  let hash = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Usar hash para gerar vector único
  for (let i = 0; i < 1536; i++) {
    vector[i] = Math.sin(hash + i) * 0.5;
  }
  
  return vector;
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