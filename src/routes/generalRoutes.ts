// src/routes/generalRoutes.ts

import { Router } from 'express';
import path from 'path';
import db from '../config/database';

const router = Router();
const publicPath = path.join(__dirname, '..', '..', 'public');

// Rotas para servir as páginas HTML
router.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});

router.get('/triador', (req, res) => {
    res.sendFile(path.join(publicPath, 'triager.html'));
});

router.get('/atendente', (req, res) => {
    res.sendFile(path.join(publicPath, 'attendant.html'));
});

router.get('/medico', (req, res) => {
    res.sendFile(path.join(publicPath, 'doctor.html'));
});

router.get('/fila', (req, res) => {
    res.sendFile(path.join(publicPath, 'queue.html'));
});



// Rota para buscar as classificações
router.get('/api/classifications', (req, res) => {
    const sql = `SELECT classification_id, color_name, level_order FROM Classification ORDER BY level_order ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar classificações:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar classificações.' });
        }
        res.status(200).json(rows);
    });
});



export default router;