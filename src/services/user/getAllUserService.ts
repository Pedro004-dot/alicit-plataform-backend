import userRepository from '../../repositories/userRepository';

const getAllUser = async () => { 
    console.log(`User`);
    const user = await userRepository.getAllUser();
    if(!user) {
        throw new Error('Erro ao buscar user');
    }
    return user;
};
    export default { getAllUser }; 