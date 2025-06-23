// src/services/userService.ts

import db from '../config/database';

export const UserService = {
   
    async validateUser(username: string, password: string): Promise<{ user_id: number; role: string } | undefined> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT user_id, role FROM User WHERE username = ? AND password = ?`;
            db.get(sql, [username, password], (err, row: { user_id: number; role: string } | undefined) => {
                if (err) {
                    console.error('Erro ao consultar usuário no banco de dados:', err.message);
                    return reject(new Error('Erro interno do servidor ao validar credenciais.'));
                }
                // Se 'row' existir, significa que as credenciais são válidas.
                resolve(row);
            });
        });
    }
};