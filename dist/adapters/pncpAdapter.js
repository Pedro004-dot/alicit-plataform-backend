"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fetchItensLicitacao = async (cnpj, ano, sequencial) => {
    try {
        const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Itens não encontrados: ${cnpj}/${ano}/${sequencial}`);
            return [];
        }
        const itens = await response.json();
        return itens || [];
    }
    catch (error) {
        console.error(`Erro ao buscar itens ${cnpj}/${ano}/${sequencial}:`, error);
        return [];
    }
};
const fetchPaginaUnica = async (baseUrl, dataFinal, pagina) => {
    try {
        const url = `${baseUrl}?dataFinal=${dataFinal}&pagina=${pagina}`;
        const response = await fetch(url);
        if (!response.ok) {
            return {
                pagina,
                data: null,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }
        const data = await response.json();
        return { pagina, data };
    }
    catch (error) {
        return {
            pagina,
            data: null,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
    }
};
const searchLicitacoesPNCP = async (params, maxPaginas = 100) => {
    const baseUrl = 'https://pncp.gov.br/api/consulta/v1/contratacoes/proposta';
    const dataFinal = params.dataFinal || new Date().toISOString().split('T')[0].replace(/-/g, '');
    const todasLicitacoes = [];
    const batchSize = 10; // 4 requisições paralelas
    let paginaAtual = params.pagina || 1;
    let totalPaginas = maxPaginas;
    let paginasProcessadas = 0;
    let totalRegistrosAPI = 0;
    console.log(`🚀 Iniciando busca paralela: data=${dataFinal}, maxPaginas=${maxPaginas}, batchSize=${batchSize}`);
    try {
        while (todasLicitacoes.length < 30000) {
            // Cria batch de URLs para requisições paralelas
            const paginasParaBuscar = [];
            for (let i = 0; i < batchSize && paginaAtual + i <= totalPaginas; i++) {
                if (paginasProcessadas + i < maxPaginas) {
                    paginasParaBuscar.push(paginaAtual + i);
                }
            }
            if (paginasParaBuscar.length === 0)
                break;
            console.log(`📦 Processando lote: páginas ${paginasParaBuscar[0]}-${paginasParaBuscar[paginasParaBuscar.length - 1]}`);
            // Executa requisições paralelas
            const promises = paginasParaBuscar.map(pagina => fetchPaginaUnica(baseUrl, dataFinal, pagina));
            const results = await Promise.allSettled(promises);
            let licitacoesDoLote = 0;
            let errosDoLote = 0;
            // Processa resultados
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { pagina, data, error } = result.value;
                    if (error) {
                        console.warn(`⚠️  Página ${pagina}: ${error}`);
                        errosDoLote++;
                        continue;
                    }
                    if (data) {
                        // Atualiza informações na primeira resposta válida
                        if (totalRegistrosAPI === 0 && data.totalRegistros > 0) {
                            totalPaginas = Math.min(data.totalPaginas, maxPaginas);
                            totalRegistrosAPI = data.totalRegistros;
                            console.log(`📊 API info: ${data.totalRegistros} registros, ${data.totalPaginas} páginas totais`);
                        }
                        if (data.data && data.data.length > 0) {
                            // Busca itens para cada licitação em paralelo
                            const licitacoesComItens = await Promise.allSettled(data.data.map(async (licitacao) => {
                                const itens = await fetchItensLicitacao(licitacao.orgaoEntidade.cnpj, licitacao.anoCompra, licitacao.sequencialCompra);
                                return { ...licitacao, itens };
                            }));
                            // Adiciona licitações com itens processados
                            for (const result of licitacoesComItens) {
                                if (result.status === 'fulfilled') {
                                    todasLicitacoes.push(result.value);
                                    licitacoesDoLote++;
                                }
                            }
                        }
                        // Verifica se não há mais dados
                        if (data.empty || data.data.length === 0 || data.paginasRestantes === 0) {
                            console.log(`🏁 Página ${pagina}: Sem mais dados disponíveis`);
                            return todasLicitacoes;
                        }
                    }
                }
                else {
                    console.error(`❌ Falha na promise:`, result.reason);
                    errosDoLote++;
                }
            }
            console.log(`✅ Lote concluído: +${licitacoesDoLote} licitações, ${errosDoLote} erros. Total: ${todasLicitacoes.length}`);
            // Atualiza contadores
            paginaAtual += paginasParaBuscar.length;
            paginasProcessadas += paginasParaBuscar.length;
            // Pausa entre lotes para não sobrecarregar a API
            if (paginasProcessadas < maxPaginas) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        console.log(`Busca paralela finalizada: ${todasLicitacoes.length} licitações em ${paginasProcessadas} páginas`);
        return todasLicitacoes;
    }
    catch (error) {
        console.error(' Erro geral na busca paralela:', error);
        console.log(` Retornando ${todasLicitacoes.length} licitações coletadas antes do erro`);
        return todasLicitacoes;
    }
};
const downloadLicitacaoPNCP = async (params) => {
    const url = `https://pncp.gov.br/api/pncp/v1/orgaos/${params.cnpj}/compras/${params.ano}/${params.sequencial}/arquivos`;
    const response = await fetch(url);
    const data = await response.json();
    const documentsUrl = [];
    let i = 0;
    for (i = 0; i < data.length; i++) {
        documentsUrl.push(data[i].url);
    }
    console.log(`Total documents: ${i}`);
    return documentsUrl;
};
exports.default = { searchLicitacoesPNCP, downloadLicitacaoPNCP };
