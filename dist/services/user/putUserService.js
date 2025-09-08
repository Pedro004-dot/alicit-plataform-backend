"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userRepository_1 = __importDefault(require("../../repositories/userRepository"));
const putUser = async (id, userInput) => {
    console.log(`User ${id}`);
    const user = await userRepository_1.default.updateUser(id, userInput);
    if (!user) {
        throw new Error('Erro ao atualizar user');
    }
    return user;
};
exports.default = { putUser };
