"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const empresaRepository_1 = __importDefault(require("../../repositories/empresaRepository"));
const getUniqueEmpresa = async (id) => {
    const empresa = await empresaRepository_1.default.getEmpresaById(id);
    return empresa;
};
exports.default = { getUniqueEmpresa };
