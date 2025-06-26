// src/routes/queueRoutes.ts

import { Router } from 'express';
import { QueueService } from '../services/queueService';
import { QueueSortedService } from '../services/queueSortedservice';

const router = Router();

/**
 * Rota para obter a fila de prioridade ordenada.
 * Este é o endpoint centralizado para exibir a fila em qualquer tela.
 */
router.get('/api/priority-queue', async (req, res) => {
    try {
        const sortedQueue = await QueueSortedService.getPatientsOrderedByPriority();
        console.log('Fila ordenada para triagem/médicos:', sortedQueue);
        res.status(200).json(sortedQueue);
    } catch (error: any) {
        console.error('Erro ao buscar pacientes na fila de prioridade:', error.message);
        res.status(500).json({ message: error.message });
    }
});

router.post('/api/service', async (req, res) => {
    const { patient_id, attendant_id, datetime } = req.body;
    if (!patient_id || !attendant_id || !datetime) {
        return res.status(400).json({ message: 'ID do paciente, atendente e data/hora são obrigatórios.' });
    }
    try {
        const serviceId = await QueueService.addPatientToServiceQueue(patient_id, attendant_id, datetime);
        res.status(201).json({ message: 'Paciente adicionado à fila de triagem!', serviceId });
    } catch (error: any) {
        console.error('Erro ao adicionar à fila de triagem:', error.message);
        res.status(500).json({ message: error.message });
    }
});

export default router;