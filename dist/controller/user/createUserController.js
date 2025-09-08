"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const createUserService_js_1 = __importDefault(require("../../services/user/createUserService.js"));
const createUser = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
        }
        const createUser = await createUserService_js_1.default.createUser(req.body);
        res.status(201).json(createUser);
        return createUser;
    }
    catch (error) {
        console.error("Erro ao criar user:", error);
        res.status(500).json({ error: error.message || "Erro ao criar user" });
    }
};
exports.default = { createUser };
