// src/routes/doctorRoutes.ts

import { Router } from 'express';
import { DoctorService } from '../services/doctorService';
// Remova a importação de QueueSortedService, pois a rota foi removida

const router = Router();

// Rota GET /api/medical-queue removida para evitar redundância.
// Agora, tanto a tela de triagem quanto a do médico usarão a mesma rota da fila.

router.post('/api/appointment', async (req, res) => {
    const { patient_id, doctor_id, datetime, observations } = req.body;
    if (!patient_id || !doctor_id || !datetime) {
        return res.status(400).json({ message: 'Campos obrigatórios do atendimento faltando.' });
    }
    try {
        const appointmentId = await DoctorService.registerAppointment(patient_id, doctor_id, datetime, observations);
        res.status(201).json({ message: 'Atendimento registrado com sucesso!', appointmentId });
    } catch (error: any) {
        console.error('Erro ao registrar atendimento:', error.message);
        res.status(500).json({ message: error.message });
    }
});

router.put('/api/priority-queue/:queueId/status', async (req, res) => {
    const { queueId } = req.params;
    const { status } = req.body;
    if (status === undefined) {
        return res.status(400).json({ message: 'Status é obrigatório.' });
    }
    try {
        // Chamada agora usa o serviço de forma centralizada.
        await DoctorService.updatePriorityQueueStatus(Number(queueId), Number(status));
        res.status(200).json({ message: 'Status da fila atualizado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao atualizar status na fila:', error.message);
        const statusCode = error.message.includes('não encontrado') ? 404 : 500;
        res.status(statusCode).json({ message: error.message });
    }
});

export default router;