import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail, getUserEmpresas } from '../../repositories/authRepository';

export const loginService = async (email: string, senha: string) => {
  const user = await findUserByEmail(email);
  
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const isValidPassword = await bcrypt.compare(senha, user.senha);
  
  if (!isValidPassword) {
    throw new Error('Senha inválida');
  }

  const empresas = await getUserEmpresas(user.id_user);

  const token = jwt.sign(
    { 
      userId: user.id_user, 
      email: user.email,
      empresas 
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id_user,
      nome: user.nome,
      email: user.email,
      empresas
    }
  };
};