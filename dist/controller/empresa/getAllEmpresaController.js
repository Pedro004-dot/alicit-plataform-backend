"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getAllEmpresaService_js_1 = __importDefault(require("../../services/empresa/getAllEmpresaService.js"));
const getAllEmpresa = async (req, res) => {
    try {
        const getAllEmpresa = await getAllEmpresaService_js_1.default.getAllEmpresa();
        res.status(201).json(getAllEmpresa);
        return getAllEmpresa;
    }
    catch (error) {
        console.error("Erro ao buscar empresas:", error);
        res.status(500).json({ error: "Erro ao buscar empresas" });
    }
};
exports.default = { getAllEmpresa };
