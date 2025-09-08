"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const putUserService_js_1 = __importDefault(require("../../services/user/putUserService.js"));
const putUser = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "ID não informado" });
        }
        const putUser = await putUserService_js_1.default.putUser(id, req.body);
        res.status(201).json(putUser);
        return putUser;
    }
    catch (error) {
        console.error("Erro ao atualizar user:", error);
        res.status(500).json({ error: "Erro ao atualizar user" });
    }
};
exports.default = { putUser };
