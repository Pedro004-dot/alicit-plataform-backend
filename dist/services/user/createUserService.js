"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const userRepository_1 = __importDefault(require("../../repositories/userRepository"));
const createUser = async (userInput) => {
    console.log(`User ${userInput.nome}`);
    if (!userInput.senha) {
        throw new Error('Senha é obrigatória');
    }
    const hashedPassword = await bcrypt_1.default.hash(userInput.senha, 10);
    const userWithHashedPassword = {
        ...userInput,
        senha: hashedPassword
    };
    const user = await userRepository_1.default.createUser(userWithHashedPassword);
    if (!user) {
        throw new Error('Erro ao criar user');
    }
    return user;
};
exports.default = { createUser };
