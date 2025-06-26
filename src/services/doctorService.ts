// src/services/doctorService.ts

import db from '../config/database';
import { QueueService } from './queueService'; // Importa o serviço correto

export const DoctorService = {
    /**
     * Registra um novo atendimento no banco de dados.
     */
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

    /**
     * Atualiza o status de um paciente na fila de prioridade, chamando o serviço centralizado.
     */
    async updatePriorityQueueStatus(queueId: number, status: number): Promise<void> {
        // Chamando a função centralizada no QueueService.
        return QueueService.updatePriorityQueueStatus(queueId, status);
    },
    
    /**
     * Retorna a fila médica.
     * Nota: A lógica de ordenação agora deve vir do `QueueSortedService`.
     * Esta função não é mais usada para buscar a fila ordenada, mas mantida caso outras partes do código a usem.
     */
     async getMedicalQueue(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const todayLocal = new Date().toISOString().split('T')[0];
            const sql = `
                SELECT PQ.*, P.patient_name, P.cpf, P.birth_date, T.triage_id, T.datetime as triage_datetime, C.color_name, C.level_order
                FROM PriorityQueue AS PQ
                JOIN Patient AS P ON PQ.patient_id = P.patient_id
                JOIN Triage AS T ON PQ.triage_id = T.triage_id
                JOIN Classification AS C ON T.classification_id = C.classification_id
                WHERE DATE(PQ.datetime) = ? AND PQ.status IN (0, 1)
                ORDER BY C.level_order ASC, PQ.datetime ASC`;
            db.all(sql, [todayLocal], (err, rows) => {
                if (err) {
                    return reject(new Error('Erro ao buscar fila médica.'));
                }
                resolve(rows);
            });
        });
    },
};