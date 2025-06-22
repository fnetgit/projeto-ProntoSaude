// src/routes/triageRoutes.ts

import { Router } from 'express';
import { TriageService } from '../services/triageService';

const router = Router();

// ROTA DE TRIAGEM
router.post('/api/triage', async (req, res) => {
    const { patient_id, service_id, classification_id, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms } = req.body;
    if (!patient_id || !service_id || !classification_id) {
        return res.status(400).json({ message: 'Dados essenciais da triagem estão faltando.' });
    }
    try {
        const triageId = await TriageService.registerTriage({ patient_id, service_id, classification_id, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms });
        res.status(201).json({ message: 'Triagem registrada e fila de atendimento atualizada!', triageId });
    } catch (error: any) {
        console.error('Erro ao registrar triagem:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// NOVA ROTA: Obter detalhes completos da triagem e dados do paciente
router.get('/api/triage-details/:patientId/:triageId', async (req, res) => {
    const { patientId, triageId } = req.params;
    try {
        const details = await TriageService.getTriageDetails(Number(patientId), Number(triageId));
        if (!details) {
            return res.status(404).json({ message: 'Detalhes da triagem não encontrados.' });
        }
        console.log('Dados brutos da API /api/triage-details:', details);
        res.status(200).json(details);
    } catch (error: any) {
        console.error('Erro ao buscar detalhes da triagem:', error.message);
        res.status(500).json({ message: error.message });
    }
});

router.get('/api/queue-patients', async (req, res) => {
    try {
        const patientsInQueue = await TriageService.getQueuePatients();
        res.status(200).json(patientsInQueue);
    } catch (error: any) {
        console.error('Erro ao buscar pacientes na fila de triagem:', error.message);
        res.status(500).json({ message: error.message });
    }
});

router.delete('/api/queue/:serviceId', async (req, res) => {
    const { serviceId } = req.params;
    try {
        const changes = await TriageService.removePatientFromQueue(Number(serviceId));
        res.status(200).json({ message: 'Paciente marcado como "Não Compareceu".' });
    } catch (error: any) {
        console.error('Erro ao remover paciente da fila:', error.message);
        const statusCode = error.message.includes('não encontrado') ? 404 : 500;
        res.status(statusCode).json({ message: error.message });
    }
});

export default router;