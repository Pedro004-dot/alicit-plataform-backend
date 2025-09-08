import userRepository from '../../repositories/userRepository';

const getUser = async (id: string) => { 
    console.log(`User ${id}`);
    const user = await userRepository.getUser(id);
    if(!user) {
        throw new Error('Erro ao buscar user');
    }
    return user;
};
export default { getUser };