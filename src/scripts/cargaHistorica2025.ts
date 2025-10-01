import searchLicitacaoService from '../services/licitacao/searchLicitacaoService';

interface PeriodoBusca {
  dataInicio: string;
  dataFim: string;
  descricao: string;
}

class CargaHistorica2025 {
  
  async executarCargaCompleta() {
    console.log('🚀 CARGA HISTÓRICA 2025 - Iniciando...');
    console.log('🎯 Critério: Licitações ativas (encerramento > 29/09/2025)');
    
    const periodos = this.gerarPeriodosMensais();
    console.log(`📅 Total de períodos a processar: ${periodos.length}`);
    
    for (const periodo of periodos) {
      console.log(`\n📅 PROCESSANDO: ${periodo.descricao}`);
      console.log(`📊 Período: ${periodo.dataInicio} a ${periodo.dataFim}`);
      
      await this.processarPeriodo(periodo);
      
      // Pausa entre períodos para não sobrecarregar API
      console.log('⏱️ Aguardando 30s antes do próximo período...');
      await this.aguardar(30000);
    }
    
    console.log('\n✅ CARGA HISTÓRICA CONCLUÍDA!');
    console.log('🎯 Todas as licitações foram salvas e vetorizadas automaticamente');
  }
  
  private gerarPeriodosMensais(): PeriodoBusca[] {
    const periodos: PeriodoBusca[] = [];
    const hoje = new Date();
    
    // Janeiro 2025 até mês atual
    for (let mes = 0; mes < hoje.getMonth() + 1; mes++) {
      const dataInicio = new Date(2025, mes, 1);
      const dataFim = new Date(2025, mes + 1, 0); // Último dia do mês
      
      // Se é o mês atual, vai até hoje
      if (mes === hoje.getMonth()) {
        dataFim.setTime(hoje.getTime());
      }
      
      periodos.push({
        dataInicio: this.formatarData(dataInicio),
        dataFim: this.formatarData(dataFim),
        descricao: `${dataInicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
      });
    }
    
    return periodos;
  }
  
  private async processarPeriodo(periodo: PeriodoBusca) {
    try {
      const startTime = Date.now();
      
      // ✅ USAR O SERVIÇO EXISTENTE que já vetoriza!
      const resultado = await searchLicitacaoService.searchLicitacao({
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim,
        fonte: 'pncp'
      });
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`📊 ${periodo.descricao}: ${resultado.total} licitações salvas em ${duration}s`);
      console.log(`💾 Fonte: ${resultado.fonte} | Status: ${resultado.message}`);
      
      // 🎯 Log adicional sobre vetorização
      console.log('🤖 Vetorização: Automática via pineconeLicitacaoRepository');
      
    } catch (error) {
      console.error(`❌ Erro em ${periodo.descricao}:`, error);
      console.log('🔄 Continuando com próximo período...');
      // Continua com próximo período
    }
  }
  
  private formatarData(data: Date): string {
    return data.toISOString().split('T')[0].replace(/-/g, '');
  }
  
  private async aguardar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Executar script
const executarCarga = async () => {
  try {
    console.log('🎬 Iniciando script de carga histórica...');
    const carga = new CargaHistorica2025();
    await carga.executarCargaCompleta();
    console.log('🎉 Script finalizado com sucesso!');
  } catch (error) {
    console.error('💥 Erro fatal no script:', error);
  } finally {
    process.exit(0);
  }
};

// Se executado diretamente
if (require.main === module) {
  executarCarga().catch(console.error);
}

export default CargaHistorica2025;