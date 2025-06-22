// src/routes/doctorRoutes.ts

import { Router } from 'express';
import { DoctorService } from '../services/doctorService'; // Importa o DoctorService

const router = Router();

router.get('/api/medical-queue', async (req, res) => {
    try {
        const rows = await DoctorService.getMedicalQueue();
        res.status(200).json(rows);
    } catch (error: any) {
        console.error('Erro ao buscar fila médica:', error.message);
        res.status(500).json({ message: error.message });
    }
});

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
        await DoctorService.updatePriorityQueueStatus(Number(queueId), Number(status));
        res.status(200).json({ message: 'Status da fila atualizado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao atualizar status na fila:', error.message);
        const statusCode = error.message.includes('não encontrado') ? 404 : 500;
        res.status(statusCode).json({ message: error.message });
    }
});

export default router;