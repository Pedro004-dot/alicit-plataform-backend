"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loginController_js_1 = require("../controller/auth/loginController.js");
const router = (0, express_1.Router)();
router.post('/login', loginController_js_1.loginController);
exports.default = router;
