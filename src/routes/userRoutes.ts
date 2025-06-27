import { Router } from 'express';
import { UserService } from '../services/userService';

const router = Router();

router.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const user = await UserService.validateUser(username, password);

        if (user) {
            let redirectPath: string;
            let userRoleDisplay: string;

            switch (user.role) {
                case 'attendant':
                    redirectPath = '/atendente';
                    userRoleDisplay = 'Atendente';
                    break;
                case 'triager':
                    redirectPath = '/triador';
                    userRoleDisplay = 'Triador';
                    break;
                case 'doctor':
                    redirectPath = '/medico';
                    userRoleDisplay = 'Médico';
                    break;
                default:
                    redirectPath = '/';
                    userRoleDisplay = 'Usuário';
            }

            res.status(200).json({
                message: 'Login bem-sucedido!',
                redirectUrl: redirectPath,
                username: username,
                role: userRoleDisplay
            });
        } else {
            res.status(401).json({ message: 'Usuário ou senha incorretos.' });
        }
    } catch (error: any) {
        console.error('Erro no processo de login:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
    }
});

export default router;