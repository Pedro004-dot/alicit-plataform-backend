"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const usuarioService_1 = __importDefault(require("../services/usuarioService"));
class UsuarioController {
    async getEmpresaAtiva(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }
            const empresaAtiva = await usuarioService_1.default.getEmpresaAtiva(Number(userId));
            res.json({
                success: true,
                data: empresaAtiva
            });
        }
        catch (error) {
            console.error('Erro ao buscar empresa ativa:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    async setEmpresaAtiva(req, res) {
        try {
            const userId = req.user?.userId;
            const { empresaCnpj } = req.body;
            if (!userId) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }
            if (!empresaCnpj) {
                return res.status(400).json({ error: 'CNPJ da empresa é obrigatório' });
            }
            await usuarioService_1.default.setEmpresaAtiva(Number(userId), empresaCnpj);
            res.json({
                success: true,
                message: 'Empresa ativa definida com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao definir empresa ativa:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.default = new UsuarioController();
