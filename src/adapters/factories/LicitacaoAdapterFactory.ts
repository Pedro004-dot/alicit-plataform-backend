import { ILicitacaoAdapter } from '../interfaces/ILicitacaoAdapter';
import PNCPLicitacaoAdapter from '../PNCPLicitacaoAdapter';

class LicitacaoAdapterFactory {
  static create(fonte: string): ILicitacaoAdapter {
    switch(fonte.toLowerCase()) {
      case 'pncp': 
        return new PNCPLicitacaoAdapter();
      // Futuras fontes:
      // case 'comprasnet': return new ComprasNetAdapter();
      // case 'licitacoes-e': return new LicitacoesEAdapter();
      default: 
        throw new Error(`Fonte '${fonte}' não suportada. Fontes disponíveis: ${this.getFontesDisponiveis().join(', ')}`);
    }
  }
  
  static getFontesDisponiveis(): string[] {
    return ['pncp']; 
  }
  
  static getAllAdapters(): ILicitacaoAdapter[] {
    return this.getFontesDisponiveis().map(fonte => this.create(fonte));
  }
  
  static getFonteDefault(): string {
    return 'pncp';
  }
}

export default LicitacaoAdapterFactory;