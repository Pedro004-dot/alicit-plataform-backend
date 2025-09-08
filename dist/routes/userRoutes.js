"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const createUserController_js_1 = __importDefault(require("../controller/user/createUserController.js"));
const getUserController_js_1 = __importDefault(require("../controller/user/getUserController.js"));
const putUserController_js_1 = __importDefault(require("../controller/user/putUserController.js"));
const deleteUserController_js_1 = __importDefault(require("../controller/user/deleteUserController.js"));
const getAllUserController_js_1 = __importDefault(require("../controller/user/getAllUserController.js"));
const getUserEmpresasController_js_1 = require("../controller/user/getUserEmpresasController.js");
const router = (0, express_1.Router)();
router.post('/', createUserController_js_1.default.createUser);
router.get('/:id', getUserController_js_1.default.getUser);
router.get('/', getAllUserController_js_1.default.getAllUser);
router.put('/:id', putUserController_js_1.default.putUser);
router.delete('/:id', deleteUserController_js_1.default.deleteUser);
// ✅ Nova rota para buscar empresas do usuário logado
router.get('/me/empresas', authMiddleware_js_1.authMiddleware, getUserEmpresasController_js_1.getUserEmpresasController);
exports.default = router;
