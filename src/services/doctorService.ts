// src/services/doctorService.ts

import db from '../config/database';
import { QueueService } from './queueService';

export const DoctorService = {

    // Registra um novo atendimento no banco de dados.

    async registerAppointment(patient_id: number, doctor_id: number, datetime: string, observations: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO Appointment (patient_id, doctor_id, datetime, observations) VALUES (?, ?, ?, ?)`;
            db.run(sql, [patient_id, doctor_id, datetime, observations], function (err) {
                if (err) {
                    console.error('Erro ao registrar atendimento:', err.message);
                    return reject(new Error('Erro ao registrar atendimento.'));
                }
                resolve(this.lastID);
            });
        });
    },

    // Atualiza o status de um paciente na fila de prioridade, chamando o serviço centralizado.
    async updatePriorityQueueStatus(queueId: number, status: number): Promise<void> {
        // Chamando a função centralizada no QueueService.
        return QueueService.updatePriorityQueueStatus(queueId, status);
    },
};