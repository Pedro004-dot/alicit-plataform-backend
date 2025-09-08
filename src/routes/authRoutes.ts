import { Router } from 'express';
import { loginController } from '../controller/auth/loginController.js';

const router = Router();

router.post('/login', loginController);

export default router; 