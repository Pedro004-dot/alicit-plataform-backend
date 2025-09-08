interface DadosRelatorioFrontend {
  recomendacao: {
    nivel: 'ALTA' | 'MEDIA' | 'BAIXA';
    descricao: string;
    score: number;
  };
  viabilidade: {
    valor: number;
    margem: number;
    score: number;
    justificativa: string;
  };
  pontosCriticos: Array<{
    titulo: string;
    descricao: string;
    impacto: 'alto' | 'medio' | 'baixo';
    categoria: 'tecnico' | 'legal' | 'financeiro';
  }>;
  riscos: Array<{
    titulo: string;
    descricao: string;
    probabilidade: 'alta' | 'media' | 'baixa';
    impacto: 'alto' | 'medio' | 'baixo';
    mitigacao?: string;
  }>;
  requisitos: {
    atendidos: string[];
    nao_atendidos: string[];
    documentos_necessarios: string[];
    certificacoes_exigidas: string[];
  };
  cronograma: Array<{
    evento: string;
    data: string;
    status: 'futuro' | 'proximo' | 'vencido';
  }>;
  metadados: {
    data_analise: string;
    documentos_analisados: number;
    qualidade_analise: number;
    tempo_processamento: number;
  };
}

export class MarkdownParser {
  private content: string;
  private sections: Map<string, string> = new Map();

  constructor(markdownContent: string) {
    this.content = markdownContent;
    this.extractSections();
  }

  private extractSections(): void {
    const sectionRegex = /^#{1,3}\s+(.+?)\n([\s\S]*?)(?=^#{1,3}\s|$)/gm;
    let match;

    while ((match = sectionRegex.exec(this.content)) !== null) {
      const title = match[1].trim().toLowerCase();
      const content = match[2].trim();
      this.sections.set(title, content);
    }
  }

  parseToFrontendFormat(documentsAnalyzed: number, qualityScore: number, processingTime: number): DadosRelatorioFrontend {
    return {
      recomendacao: this.extractRecomendacao(),
      viabilidade: this.extractViabilidade(),
      pontosCriticos: this.extractPontosCriticos(),
      riscos: this.extractRiscos(),
      requisitos: this.extractRequisitos(),
      cronograma: this.extractCronograma(),
      metadados: {
        data_analise: new Date().toISOString(),
        documentos_analisados: documentsAnalyzed,
        qualidade_analise: qualityScore,
        tempo_processamento: processingTime
      }
    };
  }

  private extractRecomendacao(): DadosRelatorioFrontend['recomendacao'] {
    const recomendacaoText = this.findSectionByKeywords(['recomendação', 'conclusão', 'resumo executivo']);
    
    const score = this.extractScore(recomendacaoText);
    const nivel = score >= 7 ? 'ALTA' : score >= 4 ? 'MEDIA' : 'BAIXA';
    
    const descricao = this.cleanText(recomendacaoText) || 
      'Análise técnica realizada com base nos documentos disponíveis.';

    return { nivel, descricao, score };
  }

  private extractViabilidade(): DadosRelatorioFrontend['viabilidade'] {
    const viabilidadeText = this.findSectionByKeywords(['viabilidade', 'financeiro', 'orçamento', 'valor']);
    
    const valor = this.extractMoneyValue(viabilidadeText);
    const margem = this.extractPercentage(viabilidadeText) || 15;
    const score = this.extractScore(viabilidadeText);
    
    const justificativa = this.cleanText(viabilidadeText) || 
      'Viabilidade baseada na análise dos valores e margens identificados no edital.';

    return { valor, margem, score, justificativa };
  }

  private extractPontosCriticos(): DadosRelatorioFrontend['pontosCriticos'] {
    const pontosText = this.findSectionByKeywords(['pontos críticos', 'atenção', 'importante', 'observações']);
    const pontos: DadosRelatorioFrontend['pontosCriticos'] = [];

    const lines = pontosText.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')) {
        const texto = line.replace(/^[-•*]\s*/, '').trim();
        if (texto) {
          pontos.push({
            titulo: this.extractTitle(texto),
            descricao: texto,
            impacto: this.categorizeImpact(texto),
            categoria: this.categorizeType(texto)
          });
        }
      }
    }

    if (pontos.length === 0) {
      const checkmarks = this.extractCheckmarkItems(this.content, ['⚠️', '❌']);
      checkmarks.forEach(item => {
        pontos.push({
          titulo: this.extractTitle(item),
          descricao: item,
          impacto: this.categorizeImpact(item),
          categoria: this.categorizeType(item)
        });
      });
    }

    return pontos;
  }

  private extractRiscos(): DadosRelatorioFrontend['riscos'] {
    const riscosText = this.findSectionByKeywords(['riscos', 'problemas', 'alertas', 'cuidados']);
    const riscos: DadosRelatorioFrontend['riscos'] = [];

    const lines = riscosText.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')) {
        const texto = line.replace(/^[-•*]\s*/, '').trim();
        if (texto) {
          riscos.push({
            titulo: this.extractTitle(texto),
            descricao: texto,
            probabilidade: this.categorizeProbability(texto),
            impacto: this.categorizeImpact(texto),
            mitigacao: this.extractMitigation(texto)
          });
        }
      }
    }

    if (riscos.length === 0) {
      const warnings = this.extractCheckmarkItems(this.content, ['⚠️', '❌']);
      warnings.forEach(item => {
        riscos.push({
          titulo: this.extractTitle(item),
          descricao: item,
          probabilidade: 'media',
          impacto: this.categorizeImpact(item)
        });
      });
    }

    return riscos;
  }

  private extractRequisitos(): DadosRelatorioFrontend['requisitos'] {
    const requisitosText = this.findSectionByKeywords(['requisitos', 'habilitação', 'documentos', 'elegibilidade']);
    
    return {
      atendidos: this.extractCheckmarkItems(this.content, ['✅']),
      nao_atendidos: this.extractCheckmarkItems(this.content, ['❌']),
      documentos_necessarios: this.extractDocuments(requisitosText),
      certificacoes_exigidas: this.extractCertifications(requisitosText)
    };
  }

  private extractCronograma(): DadosRelatorioFrontend['cronograma'] {
    const cronogramaText = this.findSectionByKeywords(['prazos', 'cronograma', 'datas', 'calendário']);
    const cronograma: DadosRelatorioFrontend['cronograma'] = [];

    const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g;
    const dates = cronogramaText.match(dateRegex);
    
    if (dates) {
      dates.forEach(dateStr => {
        const context = this.extractContextAroundDate(cronogramaText, dateStr);
        const date = this.normalizeDate(dateStr);
        const status = this.determineStatus(date);
        
        cronograma.push({
          evento: context || 'Evento importante',
          data: date,
          status
        });
      });
    }

    return cronograma;
  }

  private findSectionByKeywords(keywords: string[]): string {
    for (const keyword of keywords) {
      for (const [title, content] of this.sections) {
        if (title.includes(keyword)) {
          return content;
        }
      }
    }
    
    for (const keyword of keywords) {
      if (this.content.toLowerCase().includes(keyword)) {
        const index = this.content.toLowerCase().indexOf(keyword);
        return this.content.substring(index, index + 500);
      }
    }
    
    return '';
  }

  private extractScore(text: string): number {
    const scoreRegex = /(?:score|pontuação|nota).*?(\d+(?:\.\d+)?)/i;
    const match = text.match(scoreRegex);
    if (match) return parseFloat(match[1]);

    if (text.includes('alta') || text.includes('recomendado')) return 8;
    if (text.includes('média') || text.includes('moderado')) return 6;
    if (text.includes('baixa') || text.includes('não recomendado')) return 3;
    
    return 7;
  }

  private extractMoneyValue(text: string): number {
    const moneyRegex = /R\$\s*([\d.,]+)/g;
    const matches = text.match(moneyRegex);
    
    if (matches) {
      const cleanValue = matches[0].replace(/[R$\s.]/g, '').replace(',', '.');
      return parseFloat(cleanValue);
    }
    
    return 0;
  }

  private extractPercentage(text: string): number | null {
    const percentRegex = /(\d+(?:\.\d+)?)\s*%/g;
    const match = text.match(percentRegex);
    return match ? parseFloat(match[0].replace('%', '')) : null;
  }

  private extractTitle(text: string): string {
    const firstSentence = text.split(/[.!?]/)[0];
    return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
  }

  private categorizeImpact(text: string): 'alto' | 'medio' | 'baixo' {
    const highWords = ['crítico', 'grave', 'importante', 'essencial', 'fundamental'];
    const lowWords = ['menor', 'simples', 'básico', 'opcional'];
    
    const lowerText = text.toLowerCase();
    
    if (highWords.some(word => lowerText.includes(word))) return 'alto';
    if (lowWords.some(word => lowerText.includes(word))) return 'baixo';
    return 'medio';
  }

  private categorizeType(text: string): 'tecnico' | 'legal' | 'financeiro' {
    const tecnicoWords = ['técnico', 'especificação', 'qualidade', 'prazo', 'entrega'];
    const legalWords = ['legal', 'jurídico', 'lei', 'norma', 'regulamento', 'habilitação'];
    const financeiroWords = ['financeiro', 'valor', 'preço', 'orçamento', 'custo'];
    
    const lowerText = text.toLowerCase();
    
    if (financeiroWords.some(word => lowerText.includes(word))) return 'financeiro';
    if (legalWords.some(word => lowerText.includes(word))) return 'legal';
    return 'tecnico';
  }

  private categorizeProbability(text: string): 'alta' | 'media' | 'baixa' {
    const highWords = ['provável', 'certamente', 'definitivamente', 'sempre'];
    const lowWords = ['improvável', 'raramente', 'dificilmente', 'talvez'];
    
    const lowerText = text.toLowerCase();
    
    if (highWords.some(word => lowerText.includes(word))) return 'alta';
    if (lowWords.some(word => lowerText.includes(word))) return 'baixa';
    return 'media';
  }

  private extractMitigation(text: string): string | undefined {
    const mitigationKeywords = ['solução', 'resolver', 'mitigar', 'contornar', 'evitar'];
    
    for (const keyword of mitigationKeywords) {
      const index = text.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        return text.substring(index, index + 100);
      }
    }
    
    return undefined;
  }

  private extractCheckmarkItems(content: string, emojis: string[]): string[] {
    const items: string[] = [];
    
    for (const emoji of emojis) {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes(emoji)) {
          const cleanLine = line.replace(emoji, '').trim();
          if (cleanLine) items.push(cleanLine);
        }
      }
    }
    
    return items;
  }

  private extractDocuments(text: string): string[] {
    const docKeywords = ['certidão', 'declaração', 'atestado', 'comprovante', 'documento', 'habilitação'];
    const docs: string[] = [];
    
    const lines = text.split('\n');
    for (const line of lines) {
      if (docKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        if (cleanLine) docs.push(cleanLine);
      }
    }
    
    return docs;
  }

  private extractCertifications(text: string): string[] {
    const certKeywords = ['iso', 'certificação', 'certificado', 'norma', 'padrão', 'qualificação'];
    const certs: string[] = [];
    
    const lines = text.split('\n');
    for (const line of lines) {
      if (certKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        if (cleanLine) certs.push(cleanLine);
      }
    }
    
    return certs;
  }

  private extractContextAroundDate(text: string, date: string): string {
    const index = text.indexOf(date);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + date.length + 50);
    
    return text.substring(start, end).trim();
  }

  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private determineStatus(dateStr: string): 'futuro' | 'proximo' | 'vencido' {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'vencido';
    if (diffDays <= 7) return 'proximo';
    return 'futuro';
  }

  private cleanText(text: string): string {
    return text
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/[✅❌⚠️📋🔍⚖️📊]/g, '')
      .trim();
  }
}

export { DadosRelatorioFrontend };