"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const createUserController_1 = __importDefault(require("../controller/user/createUserController"));
const getUserController_1 = __importDefault(require("../controller/user/getUserController"));
const putUserController_1 = __importDefault(require("../controller/user/putUserController"));
const deleteUserController_1 = __importDefault(require("../controller/user/deleteUserController"));
const getAllUserController_1 = __importDefault(require("../controller/user/getAllUserController"));
const getUserEmpresasController_1 = require("../controller/user/getUserEmpresasController");
const router = (0, express_1.Router)();
router.post('/', createUserController_1.default.createUser);
router.get('/:id', getUserController_1.default.getUser);
router.get('/', getAllUserController_1.default.getAllUser);
router.put('/:id', putUserController_1.default.putUser);
router.delete('/:id', deleteUserController_1.default.deleteUser);
// ✅ Nova rota para buscar empresas do usuário logado
router.get('/me/empresas', authMiddleware_1.authMiddleware, getUserEmpresasController_1.getUserEmpresasController);
exports.default = router;
