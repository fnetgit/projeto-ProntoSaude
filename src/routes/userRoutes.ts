// src/routes/userRoutes.ts (MODIFICADO)

import { Router } from 'express';
import { UserService } from '../services/userService';

const router = Router();

router.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    try {
        // user aqui terá user_id e role (do UserService.validateUser)
        // Precisamos também do username aqui. Para isso, vamos ajustar o UserService.
        const user = await UserService.validateUser(username, password);

        if (user) {
            let redirectPath: string;
            let userRoleDisplay: string; // Para o texto a ser exibido na página (ex: "Atendente", "Médico")

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
                    userRoleDisplay = 'Usuário'; // Fallback
            }

            res.status(200).json({
                message: 'Login bem-sucedido!',
                redirectUrl: redirectPath,
                // --- NOVOS CAMPOS ENVIADOS ---
                username: username, // O nome de usuário que foi logado
                role: userRoleDisplay // O texto da função para exibição
                // -----------------------------
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