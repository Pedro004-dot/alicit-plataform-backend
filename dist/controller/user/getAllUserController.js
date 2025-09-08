"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const getAllUserService_1 = __importDefault(require("../../services/user/getAllUserService"));
const getAllUser = async (req, res) => {
    try {
        const getAllUser = await getAllUserService_1.default.getAllUser();
        res.status(201).json(getAllUser);
        return getAllUser;
    }
    catch (error) {
        console.error("Erro ao buscar users:", error);
        res.status(500).json({ error: "Erro ao buscar users" });
    }
};
exports.default = { getAllUser };
