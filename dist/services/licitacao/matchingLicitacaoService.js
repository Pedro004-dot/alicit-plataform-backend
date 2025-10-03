"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pinecone_1 = require("@pinecone-database/pinecone");
const openai_1 = require("openai");
const filterEngine_1 = require("./filters/filterEngine");
const supabaseLicitacaoRepository_1 = __importDefault(require("../../repositories/supabaseLicitacaoRepository"));
const calculateMatching = async (empresaPerfil) => {
    try {
        console.log('🚀 Iniciando matching híbrido (Pinecone + Supabase)...');
        const pineconeResults = await searchSemantic(empresaPerfil);
        if (!pineconeResults.length) {
            console.log('❌ Nenhuma licitação encontrada na busca semântica');
            return [];
        }
        console.log(`🎯 ${pineconeResults.length} candidatos semânticos encontrados`);
        // 2. BUSCAR DADOS COMPLETOS NO SUPABASE
        const numeroControlePNCPs = pineconeResults.map(r => r.numeroControlePNCP);
        const licitacoesCompletas = await supabaseLicitacaoRepository_1.default.getLicitacoesByIds(numeroControlePNCPs);
        console.log(`📊 ${licitacoesCompletas.length} licitações completas recuperadas do Supabase`);
        if (!licitacoesCompletas.length) {
            console.log('⚠️ Nenhuma licitação encontrada no Supabase com os IDs do Pinecone');
            return [];
        }
        // 3. APLICAR FILTROS PRECISOS (geográfico, valor, etc.)
        const resultadoFiltros = await (0, filterEngine_1.aplicarFiltrosAtivos)(licitacoesCompletas, empresaPerfil);
        console.log('🔍 FILTROS APLICADOS:');
        resultadoFiltros.filtrosAplicados.forEach(filtro => {
            console.log(`  📋 ${filtro}`);
        });
        console.log(`📊 Redução: ${resultadoFiltros.estatisticas.totalInicial} → ${resultadoFiltros.estatisticas.totalFinal} (${resultadoFiltros.estatisticas.reducaoPercentual}%)`);
        // 4. MERGE COM SCORES SEMÂNTICOS E ORDENAR
        const resultados = resultadoFiltros.licitacoesFiltradas.map(licitacao => {
            const pineconeMatch = pineconeResults.find(r => r.numeroControlePNCP === licitacao.numeroControlePNCP);
            const semanticScore = pineconeMatch?.score || 0;
            // Enriquecer com texto completo para compatibilidade
            const textoEnriquecido = [
                licitacao.objetoCompra || '',
                licitacao.informacaoComplementar || '',
                ...(licitacao.itens?.map(item => item.descricao || '') || [])
            ].filter(text => text && text.trim().length > 0).join(' ');
            return {
                licitacao: {
                    ...licitacao,
                    textoCompleto: textoEnriquecido
                },
                matchScore: semanticScore,
                semanticScore: semanticScore,
                matchDetails: {
                    regexScore: semanticScore * 0.25,
                    levenshteinScore: semanticScore * 0.25,
                    tfidfScore: semanticScore * 0.25,
                    taxonomiaScore: semanticScore * 0.25
                },
                hybridDetails: {
                    traditional: 0,
                    semantic: semanticScore,
                    combined: semanticScore
                }
            };
        });
        // 5. FILTRAR POR THRESHOLD DE QUALIDADE (59%) E ORDENAR
        const finalMatches = resultados.sort((a, b) => b.matchScore - a.matchScore);
        // console.log(`✅ Matching híbrido concluído: ${resultados.length} → ${finalMatches.length} matches acima de ${THRESHOLD_MINIMO * 100}%`);
        return finalMatches;
    }
    catch (error) {
        console.error('❌ Erro no matching híbrido:', error);
        return [];
    }
};
/**
 * NOVA FUNÇÃO: Busca semântica no Pinecone - retorna apenas IDs + scores
 */
const searchSemantic = async (empresaPerfil) => {
    try {
        // 1. Gerar embedding da empresa
        const empresaEmbedding = await generateEmpresaEmbedding(empresaPerfil);
        // 2. Construir filtros mínimos do Pinecone (apenas licitações vs editais)
        const filters = buildPineconeFilters();
        // 3. Busca vetorial otimizada
        const pinecone = new pinecone_1.Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pinecone.index('alicit-editais');
        const searchResults = await index.query({
            vector: empresaEmbedding,
            topK: 1000, // Aumentado para mais candidatos
            includeValues: false,
            includeMetadata: true,
            filter: filters
        });
        if (!searchResults.matches?.length) {
            return [];
        }
        // 4. Processar resultados - extrair apenas IDs + scores
        const results = searchResults.matches
            .filter(match => {
            const isLicitacao = match.id?.startsWith('licitacao:');
            const hasValidMetadata = !!match.metadata?.numeroControlePNCP;
            if (!isLicitacao || !hasValidMetadata) {
                console.log(`⚠️ Removendo item inválido: ${match.id} (isLicitacao: ${isLicitacao}, hasMetadata: ${hasValidMetadata})`);
                return false;
            }
            return true;
        })
            .map(match => ({
            numeroControlePNCP: match.metadata?.numeroControlePNCP,
            score: match.score || 0
        }))
            .filter(result => result.numeroControlePNCP); // Remove items sem ID
        console.log(`🔍 Pinecone: ${searchResults.matches.length} → ${results.length} candidatos válidos`);
        return results;
    }
    catch (error) {
        console.error('❌ Erro na busca semântica Pinecone:', error);
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
    const filters = {
        numeroControlePNCP: { $exists: true }
    };
    console.log('🔍 Filtro Pinecone aplicado: apenas licitações (sem filtros geográficos/valor)');
    return filters;
};
exports.default = {
    calculateMatching
};
