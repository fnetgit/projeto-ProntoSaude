// src/services/doctorService.ts

import db from '../config/database';

export const DoctorService = {
    async getMedicalQueue(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const todayLocal = new Date().toISOString().split('T')[0];
            const sql = `
                SELECT PQ.*, P.patient_name, P.cpf, P.birth_date, C.color_name, C.level_order
                FROM PriorityQueue AS PQ
                JOIN Patient AS P ON PQ.patient_id = P.patient_id
                JOIN Triage AS T ON P.patient_id = T.patient_id AND DATE(T.datetime) = ?
                JOIN Classification AS C ON T.classification_id = C.classification_id
                WHERE DATE(PQ.datetime) = ? AND PQ.status = 0
                ORDER BY C.level_order ASC, PQ.datetime ASC`;
            db.all(sql, [todayLocal, todayLocal], (err, rows) => {
                if (err) {
                    return reject(new Error('Erro ao buscar fila médica.'));
                }
                resolve(rows);
            });
        });
    },

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

    async updatePriorityQueueStatus(queueId: number, status: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE PriorityQueue SET status = ? WHERE queue_id = ?`;
            db.run(sql, [status, queueId], function (err) {
                if (err) {
                    console.error('Erro ao atualizar status na fila de prioridade (médico):', err.message);
                    return reject(new Error('Erro ao atualizar status na fila de prioridade.'));
                }
                if (this.changes === 0) {
                    return reject(new Error('Registro na fila de prioridade não encontrado.'));
                }
                resolve(this.changes);
            });
        });
    }
};