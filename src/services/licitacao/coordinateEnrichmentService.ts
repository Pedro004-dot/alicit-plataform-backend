import { createClient } from '@supabase/supabase-js';
import { PNCPLicitacao } from './metrics';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * SERVICE PARA ENRIQUECIMENTO DE COORDENADAS
 * Adiciona latitude/longitude baseado no codigo_ibge
 */
export class CoordinateEnrichmentService {

  /**
   * Cache de coordenadas para evitar consultas repetidas
   */
  private coordenadasCache = new Map<string, { latitude: number; longitude: number } | null>();

  /**
   * Enriquecer array de licitações com coordenadas
   */
  async enrichLicitacoesWithCoordinates(licitacoes: PNCPLicitacao[]): Promise<PNCPLicitacao[]> {
    if (!licitacoes || licitacoes.length === 0) {
      return licitacoes;
    }

    console.log(`🗺️ Enriquecendo ${licitacoes.length} licitações com coordenadas...`);

    const enrichedLicitacoes: PNCPLicitacao[] = [];
    let enrichedCount = 0;

    for (const licitacao of licitacoes) {
      try {
        const enrichedLicitacao = await this.enrichSingleLicitacao(licitacao);
        enrichedLicitacoes.push(enrichedLicitacao);

        // Verificar se foi enriquecida
        if (enrichedLicitacao.latitude && enrichedLicitacao.longitude) {
          enrichedCount++;
        }

      } catch (error) {
        console.log(`⚠️ Erro ao enriquecer licitação ${licitacao.numeroControlePNCP}:`, error);
        // Adicionar licitação original em caso de erro
        enrichedLicitacoes.push(licitacao);
      }
    }

    console.log(`✅ ${enrichedCount}/${licitacoes.length} licitações enriquecidas com coordenadas`);
    return enrichedLicitacoes;
  }

  /**
   * Enriquecer uma única licitação
   */
  private async enrichSingleLicitacao(licitacao: PNCPLicitacao): Promise<PNCPLicitacao> {
    // Se já tem coordenadas, retornar como está
    if (licitacao.latitude && licitacao.longitude) {
      return licitacao;
    }

    // Extrair codigo_ibge
    const codigoIbge = this.extractCodigoIbge(licitacao);
    if (!codigoIbge) {
      console.log(`⚠️ ${licitacao.numeroControlePNCP}: Sem código IBGE`);
      return licitacao;
    }

    // Buscar coordenadas
    const coordenadas = await this.getCoordinatesByIbge(codigoIbge);
    if (!coordenadas) {
      console.log(`⚠️ ${licitacao.numeroControlePNCP}: IBGE ${codigoIbge} não encontrou coordenadas`);
      return licitacao;
    }

    console.log(`✅ ${licitacao.numeroControlePNCP}: Enriquecida com ${coordenadas.latitude}, ${coordenadas.longitude}`);

    // Retornar licitação enriquecida
    return {
      ...licitacao,
      latitude: coordenadas.latitude,
      longitude: coordenadas.longitude
    };
  }

  /**
   * Extrair codigo_ibge da licitação
   */
  private extractCodigoIbge(licitacao: PNCPLicitacao): string | null {
    // Tentar várias formas de extrair o código IBGE
    const possibleSources = [
      licitacao.unidadeOrgao?.codigoIbge,
      licitacao.codigoIbge,
      (licitacao as any).codigo_ibge
    ];

    for (const source of possibleSources) {
      if (source && typeof source === 'string' && source.trim().length > 0) {
        return source.trim();
      }
    }

    return null;
  }

  /**
   * Buscar coordenadas por código IBGE (com cache)
   */
  private async getCoordinatesByIbge(codigoIbge: string): Promise<{ latitude: number; longitude: number } | null> {
    // Verificar cache
    if (this.coordenadasCache.has(codigoIbge)) {
      return this.coordenadasCache.get(codigoIbge) || null;
    }

    try {
      const { data: municipio, error } = await supabase
        .from('municipios')
        .select('latitude, longitude')
        .eq('codigo_ibge', codigoIbge)
        .single();

      if (error || !municipio) {
        // Cachear resultado negativo para evitar consultas repetidas
        this.coordenadasCache.set(codigoIbge, null);
        return null;
      }

      const coordenadas = {
        latitude: parseFloat(municipio.latitude),
        longitude: parseFloat(municipio.longitude)
      };

      // Cachear resultado positivo
      this.coordenadasCache.set(codigoIbge, coordenadas);
      return coordenadas;

    } catch (error) {
      console.log(`❌ Erro ao buscar coordenadas para IBGE ${codigoIbge}:`, error);
      this.coordenadasCache.set(codigoIbge, null);
      return null;
    }
  }

  /**
   * Limpar cache (útil para testes)
   */
  clearCache(): void {
    this.coordenadasCache.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    const size = this.coordenadasCache.size;
    const hits = Array.from(this.coordenadasCache.values()).filter(v => v !== null).length;
    const misses = size - hits;

    return { size, hits, misses };
  }
}

export default new CoordinateEnrichmentService();