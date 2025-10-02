import { Request, Response } from 'express';
import redisCache from '../../services/cache/redisCache';

export const getCacheStats = async (req: Request, res: Response) => {
  try {
    const stats = await redisCache.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas do cache'
    });
  }
};

export const clearAllCache = async (req: Request, res: Response) => {
  try {
    await redisCache.clearLicitacoesCache();
    await redisCache.clearBuscaCache();
    
    res.json({
      success: true,
      message: 'Cache limpo com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar cache'
    });
  }
};

export const healthCheckRedis = async (req: Request, res: Response) => {
  try {
    const isHealthy = await redisCache.ping();
    
    res.json({
      success: true,
      healthy: isHealthy,
      message: isHealthy ? 'Redis operacional' : 'Redis indisponível'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Erro ao verificar Redis'
    });
  }
};