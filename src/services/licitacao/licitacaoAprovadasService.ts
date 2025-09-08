import licitacaoDecisaoRepository from '../../repositories/licitacaoDecisaoRepository';

class LicitacaoAprovadasService {
  async listarLicitacoesAprovadas(empresaCnpj: string) {
    const licitacoes = await licitacaoDecisaoRepository
      .listarLicitacoesAprovadas(empresaCnpj);

    return {
      success: true,
      data: licitacoes,
      total: licitacoes.length
    };
  }
}

export default new LicitacaoAprovadasService();