// src/routes/userRoutes.ts

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
            // AQUI está o código que constrói a URL de redirecionamento
            let redirectPath: string;
            switch (user.role) {
                case 'attendant':
                    redirectPath = '/atendente'; // Retorna '/atendente'
                    break;
                case 'triager':
                    redirectPath = '/triador';   // Retorna '/triador'
                    break;
                case 'doctor':
                    redirectPath = '/medico';    // Retorna '/medico'
                    break;
                default:
                    redirectPath = '/'; // Redirecionamento padrão caso a role seja desconhecida
            }

            res.status(200).json({
                message: 'Login bem-sucedido!',
                redirectUrl: redirectPath // Esta é a URL que será enviada ao navegador
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