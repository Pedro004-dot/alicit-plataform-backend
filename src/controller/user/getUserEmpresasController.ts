import { Request, Response } from 'express';
import { getUserEmpresas } from '../../repositories/authRepository';

interface UserPayload {
  userId: number;
  email: string;
  empresas: Array<{
    id_empresa: string;
    nome: string;
    cnpj: string;
  }>;
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const getUserEmpresasController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const empresas = await getUserEmpresas(userId);
    
    return res.status(200).json({
      success: true,
      empresas
    });
  } catch (error: any) {
    console.error('Erro ao buscar empresas do usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};