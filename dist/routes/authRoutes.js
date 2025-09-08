import { Router } from 'express';
import { loginController } from '../controller/auth/loginController';
const router = Router();
router.post('/login', loginController);
export default router;
