"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getUserService_1 = __importDefault(require("../../services/user/getUserService"));
const getUser = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "ID não informado" });
        }
        const getUser = await getUserService_1.default.getUser(id);
        res.status(201).json(getUser);
        return getUser;
    }
    catch (error) {
        console.error("Erro ao buscar user:", error);
        res.status(500).json({ error: "Erro ao buscar user" });
    }
};
exports.default = { getUser };
