"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const deleteEmpresaService_js_1 = __importDefault(require("../../services/empresa/deleteEmpresaService.js"));
const deleteEmpresa = async (req, res) => {
    try {
        const { cnpj } = req.body;
        if (!cnpj) {
            return res.status(400).json({ error: "CNPJ não informado" });
        }
        const deleteEmpresa = await deleteEmpresaService_js_1.default.deleteEmpresa(cnpj);
        res.status(201).json(deleteEmpresa);
        return deleteEmpresa;
    }
    catch (error) {
        console.error("Erro ao deletar empresa:", error);
        res.status(500).json({ error: "Erro ao deletar empresa" });
    }
};
exports.default = { deleteEmpresa };
