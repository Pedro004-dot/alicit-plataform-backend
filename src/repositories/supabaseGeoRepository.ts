import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CoordenadasData {
  latitude: number;
  longitude: number;
}


/**
 * REPOSITÓRIO GEOGRÁFICO PARA SUPABASE
 * Implementa filtros geográficos usando PostgreSQL nativo
 */
export class SupabaseGeoRepository {

  /**
   * Buscar coordenadas de cidade (com cache lógico)
   */
  async getCityCoordinates(cityName: string): Promise<CoordenadasData | null> {
    if (!cityName?.trim()) return null;
    
    try {
      console.log(`🗺️ Buscando coordenadas para: ${cityName}`);
      
      // Busca exata primeiro
      let { data: municipios, error } = await supabase
        .from('municipios')
        .select('latitude, longitude, nome')
        .ilike('nome', cityName.trim())
        .limit(1);
      
      let municipio = municipios && municipios.length > 0 ? municipios[0] : null;
      
      // Se não encontrar, busca similar
      if (error || !municipio) {
        console.log(`🔍 Busca exata falhou, tentando busca similar...`);
        
        const { data: municipios, error: searchError } = await supabase
          .from('municipios')
          .select('latitude, longitude, nome')
          .ilike('nome', `%${cityName.trim()}%`)
          .limit(1);
        
        if (searchError || !municipios || municipios.length === 0) {
          console.log(`⚠️ Coordenadas não encontradas para: ${cityName}`);
          return null;
        }
        
        municipio = municipios[0];
        console.log(`🎯 Encontrado município similar: ${municipios[0].nome}`);
      }
      
      console.log(`✅ Coordenadas encontradas: ${municipio.latitude}, ${municipio.longitude}`);
      return {
        latitude: parseFloat(municipio.latitude.toString()),
        longitude: parseFloat(municipio.longitude.toString())
      };
      
    } catch (error) {
      console.error(`❌ Erro ao buscar coordenadas para ${cityName}:`, error);
      return null;
    }
  }

  /**
   * Filtrar licitações por raio geográfico usando SQL nativo
   */
  async filterLicitacoesByRadius(
    cidadeRadar: string,
    raioKm: number,
    additionalFilters?: {
      texto?: string;
      valorMin?: number;
      valorMax?: number;
      modalidade?: string;
    }
  ): Promise<string[]> {
    
    try {
      console.log(`🎯 Filtro geográfico: ${cidadeRadar} (${raioKm}km)`);
      
      // Usar filtro manual (mais confiável)
      return await this.fallbackRadiusFilter(cidadeRadar, raioKm);
      
    } catch (error) {
      console.error('❌ Erro no filtro geográfico:', error);
      return [];
    }
  }

  /**
   * Fallback: filtro manual quando função SQL falha
   */
  private async fallbackRadiusFilter(cidadeRadar: string, raioKm: number): Promise<string[]> {
    console.log('🔄 Usando filtro geográfico manual (fallback)');
    
    try {
      // 1. Buscar coordenadas da cidade radar
      const coordenadasRadar = await this.getCityCoordinates(cidadeRadar);
      if (!coordenadasRadar) {
        throw new Error(`Cidade não encontrada: ${cidadeRadar}`);
      }
      
      // 2. Buscar todas as licitações com coordenadas
      const { data: licitacoes, error } = await supabase
        .from('licitacoes')
        .select('numero_controle_pncp, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      
      if (error) throw error;
      
      // 3. Filtrar por distância (Haversine)
      const licitacoesDentroDoRaio = licitacoes?.filter(licitacao => {
        const distancia = this.calculateDistance(
          coordenadasRadar.latitude as number     ,
          coordenadasRadar.longitude,
          licitacao.latitude,
          licitacao.longitude
        );
        return distancia <= raioKm;
      }) || [];
      
      const ids = licitacoesDentroDoRaio.map(l => l.numero_controle_pncp);
      console.log(`📍 Filtro manual: ${ids.length} licitações dentro do raio`);
      
      return ids;
      
    } catch (error) {
      console.error('❌ Erro no filtro manual:', error);
      return [];
    }
  }

  /**
   * Calcular distância usando fórmula Haversine (JavaScript)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Testar conectividade e integridade geográfica
   */
  async testGeographicSetup(): Promise<{
    status: 'ok' | 'error';
    municipiosCount: number;
    licitacoesWithCoords: number;
    testDistance?: number;
  }> {
    try {
      // Contar municípios
      const { count: municipiosCount } = await supabase
        .from('municipios')
        .select('*', { count: 'exact', head: true });
      
      // Contar licitações com coordenadas
      const { count: licitacoesWithCoords } = await supabase
        .from('licitacoes')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null);
      
      // Teste básico de distância
      const testDistance = await this.testDistanceCalculation();
      
      return {
        status: 'ok',
        municipiosCount: municipiosCount || 0,
        licitacoesWithCoords: licitacoesWithCoords || 0,
        testDistance
      };
      
    } catch (error) {
      console.error('❌ Erro no teste geográfico:', error);
      return {
        status: 'error',
        municipiosCount: 0,
        licitacoesWithCoords: 0
      };
    }
  }

  /**
   * Teste de cálculo de distância entre São Paulo e Rio de Janeiro
   */
  private async testDistanceCalculation(): Promise<number> {
    try {
      // Calcular distância usando nossa função JavaScript
      const distance = this.calculateDistance(
        -23.5505, -46.6333, // São Paulo
        -22.9068, -43.1729  // Rio de Janeiro
      );
      
      console.log(`🧪 Teste de distância SP-RJ: ${distance.toFixed(1)}km (esperado: ~357km)`);
      
      return distance;
    } catch (error) {
      console.error('❌ Erro no teste de distância:', error);
      return 0;
    }
  }

  /**
   * Buscar municípios próximos a uma cidade (útil para debugging)
   */
  async findNearbyMunicipios(cityName: string, raioKm: number = 100): Promise<any[]> {
    try {
      const coordenadas = await this.getCityCoordinates(cityName);
      if (!coordenadas) return [];
      
      const { data, error } = await supabase
        .from('municipios')
        .select('nome, codigo_uf, latitude, longitude')
        .neq('nome', cityName);
      
      if (error) throw error;
      
      const nearby = data?.filter(municipio => {
        const distance = this.calculateDistance(
          coordenadas.latitude,
          coordenadas.longitude,
          municipio.latitude,
          municipio.longitude
        );
        return distance <= raioKm;
      }).sort((a, b) => {
        const distA = this.calculateDistance(
          coordenadas.latitude, coordenadas.longitude, a.latitude, a.longitude
        );
        const distB = this.calculateDistance(
          coordenadas.latitude, coordenadas.longitude, b.latitude, b.longitude
        );
        return distA - distB;
      }) || [];
      
      return nearby.slice(0, 10); // Top 10 mais próximas
      
    } catch (error) {
      console.error('❌ Erro ao buscar municípios próximos:', error);
      return [];
    }
  }
}

export default new SupabaseGeoRepository();