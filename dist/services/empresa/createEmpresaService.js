"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const empresaRepository_1 = __importDefault(require("../../repositories/empresaRepository"));
const userRepository_1 = __importDefault(require("../../repositories/userRepository"));
const createEmpresa = async (empresaInput) => {
    console.log(`Empresa ${empresaInput.nome}`);
    const empresa = await empresaRepository_1.default.createEmpresa(empresaInput);
    if (!empresa) {
        throw new Error('Erro ao criar empresa');
    }
    if (empresaInput.usuario_id) {
        await userRepository_1.default.createUserEmpresaRelation(empresaInput.usuario_id, empresa.id);
    }
    return empresa;
};
exports.default = { createEmpresa };
