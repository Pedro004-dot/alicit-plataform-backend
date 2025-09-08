"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log('🔍 AuthMiddleware - Token recebido:', token ? 'Sim' : 'Não');
    console.log('🔍 AuthMiddleware - JWT_SECRET configurado:', process.env.JWT_SECRET ? 'Sim' : 'Não');
    if (!token) {
        console.log('❌ Token não fornecido');
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        console.log('✅ Token decodificado:', decoded);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log('❌ Erro ao verificar token:', error);
        return res.status(401).json({ error: 'Token inválido' });
    }
};
exports.authMiddleware = authMiddleware;
// ✅ Função adminOnly removida - role não está mais no JWT
