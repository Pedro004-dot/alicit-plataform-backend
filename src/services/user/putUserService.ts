import userRepository from '../../repositories/userRepository';

const putUser = async (id: string, userInput: any) => { 
    console.log(`User ${id}`);
    const user = await userRepository.updateUser(id, userInput);
    if(!user) {
        throw new Error('Erro ao atualizar user');
    }
    return user;
};
export default { putUser };