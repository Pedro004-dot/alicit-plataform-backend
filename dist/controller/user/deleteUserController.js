"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const deleteUserService_1 = __importDefault(require("../../services/user/deleteUserService"));
const deleteUser = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: "ID não informado" });
        }
        const deleteUser = await deleteUserService_1.default.deleteUser(id);
        res.status(201).json(deleteUser);
        return deleteUser;
    }
    catch (error) {
        console.error("Erro ao deletar user:", error);
        res.status(500).json({ error: "Erro ao deletar user" });
    }
};
exports.default = { deleteUser };
