"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usuarioController_1 = __importDefault(require("../controller/usuarioController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Rotas para empresa ativa
router.get('/empresa-ativa', authMiddleware_1.authMiddleware, usuarioController_1.default.getEmpresaAtiva);
router.post('/empresa-ativa', authMiddleware_1.authMiddleware, usuarioController_1.default.setEmpresaAtiva);
exports.default = router;
