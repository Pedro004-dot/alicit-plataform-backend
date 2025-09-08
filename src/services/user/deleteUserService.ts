import userRepository from '../../repositories/userRepository';

const deleteUser = async (id: string) => {  
    console.log(`User ${id}`);
    const user = await userRepository.deleteUser(id);
    if(!user) {
        throw new Error('Erro ao deletar user');
    }
    return user;
};
export default { deleteUser };