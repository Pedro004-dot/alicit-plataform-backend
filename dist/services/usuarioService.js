"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const usuarioRepository_1 = __importDefault(require("../repository/usuarioRepository"));
class UsuarioService {
    async getEmpresaAtiva(userId) {
        return await usuarioRepository_1.default.getEmpresaAtiva(userId);
    }
    async setEmpresaAtiva(userId, empresaCnpj) {
        // Verificar se o usuário tem acesso à empresa
        const userEmpresas = await usuarioRepository_1.default.getEmpresasDoUsuario(userId);
        const hasAccess = userEmpresas.some(emp => emp.cnpj === empresaCnpj);
        if (!hasAccess) {
            throw new Error('Usuário não tem acesso a esta empresa');
        }
        return await usuarioRepository_1.default.setEmpresaAtiva(userId, empresaCnpj);
    }
}
exports.default = new UsuarioService();
