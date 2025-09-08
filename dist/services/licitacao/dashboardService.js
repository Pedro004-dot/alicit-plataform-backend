import licitacaoEmpresaRepository from "../../repositories/licitacaoEmpresaRepository";
class DashboardService {
    async getDashboardData(cnpj) {
        // Buscar todas as licitações da empresa
        const licitacoes = await licitacaoEmpresaRepository.listarPorEmpresa(cnpj);
        // Contar por status
        const contadores = {
            analise: 0,
            aguardando_confirmacao: 0,
            impugnacao: 0,
            enviada: 0,
            vencida: 0,
            perdida: 0,
            total: licitacoes.length // Total = todas as licitações (incluindo recusadas)
        };
        licitacoes.forEach(licitacao => {
            const status = licitacao.status;
            // Contar por status específico baseado nos status reais da tabela
            if (status === 'em_analise')
                contadores.analise++;
            else if (status === 'aprovado')
                contadores.aguardando_confirmacao++;
            else if (status === 'nao_definido')
                contadores.analise++; // não_definido conta como análise
            else if (status === 'recusado' || status === 'recusada') {
                // Recusadas não contam para análise, mas contam para o total
            }
            // Os outros status (enviada, vencida, perdida) não existem ainda na tabela
        });
        return contadores;
    }
    async getLicitacoesComEstagios(cnpj) {
        // Como a tabela de estágios está vazia, vamos usar o repositório principal
        // e simular os estágios baseados no status
        const licitacoes = await licitacaoEmpresaRepository.listarPorEmpresa(cnpj);
        // Mapear dados para formato esperado pelo frontend
        return licitacoes.map((item) => ({
            id: item.id.toString(),
            numeroControlePNCP: item.numeroControlePNCP,
            statusAprovacao: item.status,
            dataAprovacao: item.dataAtualizacao,
            objetoCompra: item.licitacao?.objetoCompra || '',
            valorTotalEstimado: item.licitacao?.valorTotalEstimado || 0,
            dataAberturaProposta: item.licitacao?.dataAberturaProposta || '',
            dataEncerramentoProposta: item.licitacao?.dataEncerramentoProposta || '',
            modalidadeNome: item.licitacao?.modalidadeNome || '',
            situacaoCompraNome: item.licitacao?.situacaoCompraNome || '',
            estagioAtual: {
                id: item.id.toString(),
                estagio: this.mapearStatusParaEstagio(item.status),
                dataInicio: item.dataAtualizacao,
                dataFim: null,
                observacoes: null
            }
        }));
    }
    mapearStatusParaEstagio(status) {
        const mapeamento = {
            'nao_definido': 'analise',
            'em_analise': 'analise',
            'aprovado': 'aguardando_confirmacao',
            'enviada': 'enviada',
            'vencida': 'vencida',
            'perdida': 'perdida',
            'recusada': 'recusada',
            'recusado': 'recusada'
        };
        return mapeamento[status] || 'analise';
    }
}
export default new DashboardService();
