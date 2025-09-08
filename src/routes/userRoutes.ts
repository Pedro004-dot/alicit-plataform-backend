import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import createUserController from '../controller/user/createUserController';
import getUserController from '../controller/user/getUserController';
import putUserController from '../controller/user/putUserController';
import deleteUserController from '../controller/user/deleteUserController';
import getAllUserController from '../controller/user/getAllUserController';
import { getUserEmpresasController } from '../controller/user/getUserEmpresasController';

const router = Router();    
 
router.post('/', createUserController.createUser);
router.get('/:id', getUserController.getUser);
router.get('/', getAllUserController.getAllUser);
router.put('/:id', putUserController.putUser);
router.delete('/:id', deleteUserController.deleteUser);

// ✅ Nova rota para buscar empresas do usuário logado
router.get('/me/empresas', authMiddleware, getUserEmpresasController);



export default router;