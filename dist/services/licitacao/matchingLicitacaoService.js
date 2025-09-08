"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("openai");
const filterEngine_1 = require("./filters/filterEngine");
const calculateMatching = async (empresaPerfil) => {
    try {
        console.log('🚀 Iniciando matching otimizado via Pinecone...');
        // 1. Gerar embedding da empresa
        const empresaEmbedding = await generateEmpresaEmbedding(empresaPerfil);
        // 2. Construir filtros mínimos do Pinecone (apenas licitações vs editais)
        const filters = buildPineconeFilters();
        // 3. Busca vetorial otimizada - apenas top candidatos
        const pinecone = new pinecone_1.Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pinecone.index('alicit-editais');
        const searchResults = await index.query({
            vector: empresaEmbedding,
            topK: 500, // Mais candidatos para compensar remoção dos filtros
            includeValues: false,
            includeMetadata: true,
            filter: filters
        });
        console.log(`🎯 ${searchResults.matches?.length || 0} candidatos encontrados via busca vetorial`);
        if (!searchResults.matches?.length) {
            console.log('❌ Nenhuma licitação encontrada com os filtros aplicados');
            return [];
        }
        // 4. Processar resultados do Pinecone - filtrar apenas licitações
        const candidates = searchResults.matches
            .filter(match => {
            // Garantir que é uma licitação com dados válidos
            const isLicitacao = match.id?.startsWith('licitacao:');
            const hasData = !!match.metadata?.data;
            if (!isLicitacao || !hasData) {
                console.log(`⚠️ Removendo item inválido: ${match.id} (isLicitacao: ${isLicitacao}, hasData: ${hasData})`);
                return false;
            }
            return true;
        })
            .map(match => {
            try {
                return {
                    licitacao: JSON.parse(match.metadata?.data),
                    pineconeScore: match.score || 0,
                    metadata: match.metadata
                };
            }
            catch (error) {
                console.warn(`⚠️ Erro ao parsear licitação ${match.id}:`, error);
                return null;
            }
        })
            .filter(candidate => candidate !== null);
        // 5. CONVERTER para licitações simples para o filterEngine
        const licitacoesParaFiltro = candidates.map(candidate => candidate.licitacao);
        console.log(`📊 ${licitacoesParaFiltro.length} licitações semânticas encontradas, aplicando filtros precisos...`);
        // 6. APLICAR FILTROS PRECISOS usando filterEngine.ts
        const resultadoFiltros = await (0, filterEngine_1.aplicarFiltrosAtivos)(licitacoesParaFiltro, empresaPerfil);
        console.log('🔍 FILTROS APLICADOS:');
        resultadoFiltros.filtrosAplicados.forEach(filtro => {
            console.log(`  📋 ${filtro}`);
        });
        console.log(`📊 Redução: ${resultadoFiltros.estatisticas.totalInicial} → ${resultadoFiltros.estatisticas.totalFinal} (${resultadoFiltros.estatisticas.reducaoPercentual}%)`);
        // 7. ENRIQUECER dados das licitações com informação complementar
        const licitacoesEnriquecidas = resultadoFiltros.licitacoesFiltradas.map(licitacao => {
            // Enriquecer com informacaoComplementar e descricaoItem dos itens
            const textoEnriquecido = [
                licitacao.objetoCompra || '',
                licitacao.informacaoComplementar || '',
                ...(licitacao.itens?.map(item => item.descricao || '') || [])
            ].filter(text => text && text.trim().length > 0).join(' ');
            return {
                ...licitacao,
                textoCompleto: textoEnriquecido
            };
        });
        // 8. RERANK SIMPLES: Ordenar por score semântico do Pinecone
        const finalMatches = licitacoesEnriquecidas
            .map(licitacao => {
            // Encontrar score original do Pinecone
            const candidate = candidates.find(c => c.licitacao.numeroControlePNCP === licitacao.numeroControlePNCP);
            const pineconeScore = candidate?.pineconeScore || 0;
            return {
                licitacao,
                matchScore: pineconeScore, // Score semântico puro
                semanticScore: pineconeScore,
                matchDetails: {
                    regexScore: pineconeScore * 0.25,
                    levenshteinScore: pineconeScore * 0.25,
                    tfidfScore: pineconeScore * 0.25,
                    taxonomiaScore: pineconeScore * 0.25
                },
                hybridDetails: {
                    traditional: 0,
                    semantic: pineconeScore,
                    combined: pineconeScore
                }
            };
        })
            .sort((a, b) => b.matchScore - a.matchScore) // Ordenar por score semântico
            .slice(0, 20); // Top 20 matches
        console.log(`✅ Matching híbrido concluído: ${finalMatches.length} matches finais`);
        return finalMatches;
    }
    catch (error) {
        console.error('❌ Erro no matching otimizado:', error);
        return [];
    }
};
/**
 * Gera embedding FOCADO da empresa usando apenas campos essenciais para semântica
 * Focamos em CONTEÚDO SEMÂNTICO, não identificação ou localização
 */
const generateEmpresaEmbedding = async (empresaPerfil) => {
    const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // EMBEDDING FOCADO: Apenas 5 campos essenciais para busca semântica
    const empresaText = [
        // 1. RAZÃO SOCIAL - Identidade da empresa
        empresaPerfil.razaoSocial || '',
        // 2. DESCRIÇÃO - Descrição detalhada do negócio
        empresaPerfil.descricao || '',
        // 3. PALAVRAS-CHAVE - Keywords específicas
        empresaPerfil.palavrasChave || '',
        // 4. PRODUTOS DETALHADOS - Lista completa de produtos
        empresaPerfil.produtos?.length ? empresaPerfil.produtos.join(', ') : '',
        // 5. SERVIÇOS DETALHADOS - Lista completa de serviços
        empresaPerfil.servicos?.length ? empresaPerfil.servicos.join(', ') : ''
    ].filter(text => text && text.trim().length > 0).join('. ');
    if (!empresaText || empresaText.length < 10) {
        console.error('❌ ERRO: Empresa sem dados suficientes para embedding');
        console.error('Dados recebidos:', JSON.stringify({
            razaoSocial: empresaPerfil.razaoSocial,
            descricao: empresaPerfil.descricao,
            palavrasChave: empresaPerfil.palavrasChave,
            produtos: empresaPerfil.produtos?.length || 0,
            servicos: empresaPerfil.servicos?.length || 0
        }, null, 2));
        throw new Error('Empresa deve ter pelo menos razão social, descrição ou produtos/serviços para matching semântico');
    }
    console.log(`🔤 Gerando embedding FOCADO para: "${empresaPerfil.razaoSocial || empresaPerfil.cnpj}"`);
    console.log(`📝 Texto semântico (${empresaText.length} chars): "${empresaText.substring(0, 200)}..."`);
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: empresaText.substring(0, 8000),
        encoding_format: 'float',
    });
    return response.data[0].embedding;
};
/**
 * Constrói filtros MÍNIMOS do Pinecone - apenas distinguir licitações de editais
 * Todos os outros filtros (região, valor, modalidade) serão aplicados pelo filterEngine.ts
 */
const buildPineconeFilters = () => {
    // ÚNICO filtro: apenas licitações (não chunks de editais)
    const filters = {
        numeroControlePNCP: { $exists: true }
    };
    console.log('🔍 Filtro Pinecone aplicado: apenas licitações (sem filtros geográficos/valor)');
    return filters;
};
exports.default = {
    calculateMatching
};
