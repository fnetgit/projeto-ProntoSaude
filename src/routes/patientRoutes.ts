// src/routes/patientRoutes.ts

import { Router } from 'express';
import { PatientService } from '../services/patientService';
import { Patient } from '../entities/patient'; // Certifique-se de que Patient está importado

const router = Router();

// Rotas de Pacientes
router.post('/api/pacientes', async (req, res) => {
    const { patient_name, birth_date, cpf, birthplace, sus_card, address, mother_name, gender, phone } = req.body;
    if (!patient_name || !birth_date || !cpf || !sus_card) {
        return res.status(400).json({ message: 'Nome, Data de Nascimento, CPF e Cartão do SUS são obrigatórios.' });
    }
    try {
        const newPatient = new Patient(0, birthplace, patient_name, phone, gender, cpf, new Date(birth_date), sus_card, mother_name, address);
        const patientId = await PatientService.createPatient(newPatient);
        res.status(201).json({ message: 'Paciente cadastrado com sucesso!', patientId });
    } catch (error: any) {
        console.error('Erro ao cadastrar paciente:', error.message);
        const statusCode = error.message.includes('já cadastrado') ? 409 : 500;
        res.status(statusCode).json({ message: error.message });
    }
});

router.get('/api/pacientes', async (req, res) => {
    try {
        const patients = await PatientService.getAllPatients();
        res.status(200).json(patients);
    } catch (error: any) {
        console.error('Erro ao buscar pacientes:', error.message);
        res.status(500).json({ message: error.message });
    }
});

router.put('/api/pacientes/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;

    try {
        await PatientService.updatePatient(id, updatedData);
        res.status(200).json({ message: 'Paciente atualizado com sucesso' });
    } catch (error: any) {
        console.error('Erro ao atualizar paciente:', error.message);
        const statusCode = error.message.includes('não encontrado') ? 404 : 500;
        res.status(statusCode).json({ message: error.message });
    }
});

export default router;