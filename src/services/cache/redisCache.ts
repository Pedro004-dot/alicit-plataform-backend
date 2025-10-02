import { createClient, RedisClientType } from 'redis';

class RedisCache {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    // Configurar cliente Redis
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      this.client = createClient({ url: redisUrl });
    } else {
      // Fallback para credenciais separadas
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379')
        },
        password: process.env.REDIS_PASSWORD
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('🔗 Redis conectado');
      this.connected = true;
    });

    this.client.on('error', (error) => {
      console.error('❌ Erro Redis:', error);
      this.connected = false;
    });

    this.client.on('end', () => {
      console.log('🔌 Redis desconectado');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('❌ Erro ao conectar Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
    }
  }

  // Cache para licitações com TTL de 5 minutos
  async cacheLicitacoes(licitacoes: any[], ttlSeconds: number = 300): Promise<void> {
    if (!this.connected) await this.connect();
    
    const key = 'alicit:licitacoes:all';
    const data = JSON.stringify({
      licitacoes,
      timestamp: Date.now(),
      count: licitacoes.length
    });
    
    await this.client.setEx(key, ttlSeconds, data);
  }

  async getCachedLicitacoes(): Promise<any[] | null> {
    if (!this.connected) await this.connect();
    
    const key = 'alicit:licitacoes:all';
    const cached = await this.client.get(key);
    
    if (!cached) return null;
    
    try {
      const data = JSON.parse(cached);
      return data.licitacoes;
    } catch (error) {
      console.error('❌ Erro ao parsear cache:', error);
      return null;
    }
  }

  // Cache para resultados de busca específicos
  async cacheBuscaResultado(palavraChave: string, resultados: any[], ttlSeconds: number = 180): Promise<void> {
    if (!this.connected) await this.connect();
    
    const key = `alicit:busca:${this.normalizeKey(palavraChave)}`;
    const data = JSON.stringify({
      resultados,
      timestamp: Date.now(),
      count: resultados.length,
      palavraChave
    });
    
    await this.client.setEx(key, ttlSeconds, data);
  }

  async getCachedBuscaResultado(palavraChave: string): Promise<any[] | null> {
    if (!this.connected) await this.connect();
    
    const key = `alicit:busca:${this.normalizeKey(palavraChave)}`;
    const cached = await this.client.get(key);
    
    if (!cached) return null;
    
    try {
      const data = JSON.parse(cached);
      return data.resultados;
    } catch (error) {
      console.error('❌ Erro ao parsear cache de busca:', error);
      return null;
    }
  }

  // Limpar cache específico
  async clearLicitacoesCache(): Promise<void> {
    if (!this.connected) await this.connect();
    await this.client.del('alicit:licitacoes:all');
  }

  async clearBuscaCache(palavraChave?: string): Promise<void> {
    if (!this.connected) await this.connect();
    
    if (palavraChave) {
      const key = `alicit:busca:${this.normalizeKey(palavraChave)}`;
      await this.client.del(key);
    } else {
      // Limpar todas as buscas
      const keys = await this.client.keys('alicit:busca:*');
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    }
  }

  // Utilitários
  private normalizeKey(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  async getStats(): Promise<any> {
    if (!this.connected) await this.connect();
    
    const info = await this.client.info('memory');
    const keys = await this.client.keys('alicit:*');
    
    return {
      connected: this.connected,
      totalKeys: keys.length,
      memoryInfo: info,
      cacheKeys: keys
    };
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      if (!this.connected) await this.connect();
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Singleton
const redisCache = new RedisCache();

export default redisCache;