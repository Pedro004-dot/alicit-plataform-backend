"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getUniqueEmpresaService_1 = __importDefault(require("../../services/empresa/getUniqueEmpresaService"));
const getUniqueEmpresa = async (req, res) => {
    try {
        const { cnpj } = req.params;
        if (!cnpj) {
            return res.status(400).json({ error: "CNPJ não informado" });
        }
        const decodedCnpj = decodeURIComponent(cnpj);
        const getUniqueEmpresa = await getUniqueEmpresaService_1.default.getUniqueEmpresa(decodedCnpj);
        return res.status(200).json(getUniqueEmpresa);
    }
    catch (error) {
        console.error("Erro ao buscar empresa:", error);
        res.status(500).json({ error: "Erro ao buscar empresa" });
    }
};
exports.default = { getUniqueEmpresa };
