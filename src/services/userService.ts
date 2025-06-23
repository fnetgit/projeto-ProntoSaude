// src/services/userService.ts (MODIFICADO PARA RETORNAR username)

import db from '../config/database';

export const UserService = {
    async validateUser(username: string, password: string): Promise<{ user_id: number; username: string; role: string } | undefined> {
        return new Promise((resolve, reject) => {
            // Adicionado 'username' na seleção SQL
            const sql = `SELECT user_id, username, role FROM User WHERE username = ? AND password = ?`;
            db.get(sql, [username, password], (err, row: { user_id: number; username: string; role: string } | undefined) => {
                if (err) {
                    console.error('Erro ao consultar usuário no banco de dados:', err.message);
                    return reject(new Error('Erro interno do servidor ao validar credenciais.'));
                }
                resolve(row);
            });
        });
    }
};