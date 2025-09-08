import bcrypt from 'bcrypt';
import userRepository from '../../repositories/userRepository';
const createUser = async (userInput) => {
    console.log(`User ${userInput.nome}`);
    if (!userInput.senha) {
        throw new Error('Senha é obrigatória');
    }
    const hashedPassword = await bcrypt.hash(userInput.senha, 10);
    const userWithHashedPassword = {
        ...userInput,
        senha: hashedPassword
    };
    const user = await userRepository.createUser(userWithHashedPassword);
    if (!user) {
        throw new Error('Erro ao criar user');
    }
    return user;
};
export default { createUser };
