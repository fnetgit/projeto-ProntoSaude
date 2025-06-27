// src/services/triageService.ts

import db from '../config/database';

interface TriageDetails {
    triage_id: number;
    patient_id: number;
    triage_officer_id: number;
    classification_id: number;
    datetime: string;
    blood_pressure: string;
    temperature: number;
    glucose: number;
    weight: number;
    oxygen_saturation: number;
    symptoms: string;
    patient_name: string;
    birth_date: string;
    gender: string;
    color_name: string;
    level_order: number;
}

export const TriageService = {
    async registerTriage(triageData: any): Promise<number> {
        return new Promise((resolve, reject) => {
            const { patient_id, service_id, classification_id, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms } = triageData;
            const datetime = new Date().toISOString();
            const triage_officer_id = 1;

            db.serialize(() => {
                db.run('BEGIN TRANSACTION;');
                const triageSql = `INSERT INTO Triage (patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                db.run(triageSql, [patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms], function (err) {
                    if (err) {
                        console.error('Erro ao registrar triagem:', err.message);
                        db.run('ROLLBACK;');
                        return reject(new Error('Erro ao registrar triagem.'));
                    }
                    const triageId = this.lastID;

                    const updateServiceSql = `UPDATE Service SET status = 1 WHERE service_id = ?`;
                    db.run(updateServiceSql, [service_id], (err) => {
                        if (err) {
                            console.error('Erro ao atualizar status do serviço:', err.message);
                            db.run('ROLLBACK;');
                            return reject(new Error('Erro ao atualizar status do serviço.'));
                        }

                        const checkPriorityQueueSql = `SELECT queue_id FROM PriorityQueue WHERE patient_id = ? AND status = 0`;
                        db.get(checkPriorityQueueSql, [patient_id], (err, row: { queue_id: number } | undefined) => {
                            if (err) {
                                console.error('Erro ao verificar fila de prioridade:', err.message);
                                db.run('ROLLBACK;');
                                return reject(new Error('Erro ao verificar fila de prioridade.'));
                            }

                            if (row) {
                                const updatePriorityQueueSql = `UPDATE PriorityQueue SET datetime = ?, status = 0 WHERE queue_id = ?`;
                                db.run(updatePriorityQueueSql, [datetime, row.queue_id], (err) => {
                                    if (err) {
                                        console.error('Erro ao atualizar fila de prioridade existente:', err.message);
                                        db.run('ROLLBACK;');
                                        return reject(new Error('Erro ao atualizar fila de prioridade.'));
                                    }
                                    db.run('COMMIT;');
                                    resolve(triageId);
                                });
                            } else {
                                const insertPriorityQueueSql = `INSERT INTO PriorityQueue (patient_id, datetime, status) VALUES (?, ?, ?)`;
                                db.run(insertPriorityQueueSql, [patient_id, datetime, 0], (err) => {
                                    if (err) {
                                        console.error('Erro ao adicionar na fila de prioridade:', err.message);
                                        db.run('ROLLBACK;');
                                        return reject(new Error('Erro ao adicionar na fila de prioridade.'));
                                    }
                                    db.run('COMMIT;');
                                    resolve(triageId);
                                });
                            }
                        });
                    });
                });
            });
        });
    },

    async getTriageDetails(patientId: number, triageId: number): Promise<TriageDetails | undefined> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    T.triage_id, T.patient_id, T.triage_officer_id, T.classification_id, T.datetime,
                    T.blood_pressure, T.temperature, T.glucose, T.weight, T.oxygen_saturation, T.symptoms,
                    P.patient_name, P.birth_date, P.gender,
                    C.color_name, C.level_order
                FROM
                    Triage AS T
                JOIN
                    Patient AS P ON T.patient_id = P.patient_id
                JOIN
                    Classification AS C ON T.classification_id = C.classification_id
                WHERE
                    T.patient_id = ? AND T.triage_id = ?;
            `;
            db.get(sql, [patientId, triageId], (err, row: TriageDetails | undefined) => {
                if (err) {
                    console.error('Erro ao buscar detalhes da triagem:', err.message);
                    return reject(new Error('Erro ao buscar detalhes da triagem.'));
                }
                resolve(row);
            });
        });
    },

    async getQueuePatients(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const todayLocal = new Date().toISOString().split('T')[0];
            const sql = `
                SELECT S.service_id, S.datetime AS service_datetime, P.*
                FROM Service AS S JOIN Patient AS P ON S.patient_id = P.patient_id
                WHERE DATE(S.datetime) = ? AND S.status = 0 ORDER BY S.datetime ASC`;
            db.all(sql, [todayLocal], (err, rows) => {
                if (err) {
                    return reject(new Error('Erro ao buscar pacientes na fila de triagem.'));
                }
                resolve(rows);
            });
        });
    },

    async removePatientFromQueue(serviceId: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE Service SET status = 2 WHERE service_id = ?`;
            db.run(sql, [serviceId], function (err) {
                if (err) {
                    return reject(new Error('Erro ao remover paciente da fila.'));
                }
                if (this.changes === 0) {
                    return reject(new Error('Serviço não encontrado.'));
                }
                resolve(this.changes);
            });
        });
    }
};