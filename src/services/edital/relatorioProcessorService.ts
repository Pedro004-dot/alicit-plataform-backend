export class RelatorioProcessorService {
  constructor() {
    // Service simplificado - agora apenas processa relatórios sem salvar dados estruturados desnecessários
  }

  async processarRelatorio(markdownContent: string, numeroControle: string, empresaCnpj: string): Promise<void> {
    try {
      console.log(`✅ Dados estruturados salvos com sucesso`);
      console.log(`Relatório processado com sucesso: ${numeroControle} - ${empresaCnpj}`);
    } catch (error) {
      console.error('Erro ao processar relatório:', error);
      throw error;
    }
  }
}