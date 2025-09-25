import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface UserPayload {
  userId: number;
  email: string;
  empresas: Array<{
    id_empresa: string;
    nome: string;
    cnpj: string;
  }>;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  // console.log('🔍 AuthMiddleware - Token recebido:', token ? 'Sim' : 'Não');
  // console.log('🔍 AuthMiddleware - JWT_SECRET configurado:', process.env.JWT_SECRET ? 'Sim' : 'Não');

  if (!token) {
    console.log('❌ Token não fornecido');
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as UserPayload;
    // console.log('✅ Token decodificado:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Erro ao verificar token:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ✅ Função adminOnly removida - role não está mais no JWT