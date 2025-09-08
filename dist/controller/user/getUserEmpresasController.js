"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserEmpresasController = void 0;
const authRepository_1 = require("../../repositories/authRepository");
const getUserEmpresasController = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const empresas = await (0, authRepository_1.getUserEmpresas)(userId);
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
exports.getUserEmpresasController = getUserEmpresasController;
