import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import createUserController from '../controller/user/createUserController.js';
import getUserController from '../controller/user/getUserController.js';
import putUserController from '../controller/user/putUserController.js';
import deleteUserController from '../controller/user/deleteUserController.js';
import getAllUserController from '../controller/user/getAllUserController.js';
import { getUserEmpresasController } from '../controller/user/getUserEmpresasController.js';

const router = Router();    
 
router.post('/', createUserController.createUser);
router.get('/:id', getUserController.getUser);
router.get('/', getAllUserController.getAllUser);
router.put('/:id', putUserController.putUser);
router.delete('/:id', deleteUserController.deleteUser);

// ✅ Nova rota para buscar empresas do usuário logado
router.get('/me/empresas', authMiddleware, getUserEmpresasController);



export default router;