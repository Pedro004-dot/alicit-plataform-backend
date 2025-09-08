import { getUserEmpresas } from '../../repositories/authRepository';
export const getUserEmpresasController = async (req, res) => {
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
    }
    catch (error) {
        console.error('Erro ao buscar empresas do usuário:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
