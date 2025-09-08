"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authRepository_1 = require("../../repositories/authRepository");
const loginService = async (email, senha) => {
    const user = await (0, authRepository_1.findUserByEmail)(email);
    if (!user) {
        throw new Error('Usuário não encontrado');
    }
    const isValidPassword = await bcrypt_1.default.compare(senha, user.senha);
    if (!isValidPassword) {
        throw new Error('Senha inválida');
    }
    const empresas = await (0, authRepository_1.getUserEmpresas)(user.id_user);
    const token = jsonwebtoken_1.default.sign({
        userId: user.id_user,
        email: user.email,
        empresas
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
    return {
        token,
        user: {
            id: user.id_user,
            nome: user.nome,
            email: user.email,
            empresas
        }
    };
};
exports.loginService = loginService;
