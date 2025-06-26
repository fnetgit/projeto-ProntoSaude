// src/services/queueService.ts

import db from '../config/database';

export const QueueService = {
    /**
     * Busca pacientes na fila de prioridade sem ordenação no banco de dados.
     * A ordenação será feita na camada de serviço.
     */
    async getPriorityQueueInOrder(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    PQ.queue_id,
                    PQ.patient_id,
                    PQ.datetime AS queue_datetime,
                    PQ.status AS queue_status,
                    P.patient_name,
                    C.color_name,
                    C.level_order AS priority,
                    T.triage_id,
                    T.datetime AS triage_datetime
                FROM PriorityQueue PQ
                JOIN Patient P ON PQ.patient_id = P.patient_id
                LEFT JOIN (
                    SELECT T1.*
                    FROM Triage T1
                    INNER JOIN (
                        SELECT patient_id, MAX(datetime) AS max_datetime
                        FROM Triage
                        GROUP BY patient_id
                    ) T2
                    ON T1.patient_id = T2.patient_id AND T1.datetime = T2.max_datetime
                ) T ON PQ.patient_id = T.patient_id
                LEFT JOIN Classification C ON T.classification_id = C.classification_id
                WHERE PQ.status IN (0, 1)
            `;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar fila de prioridade:', err.message);
                    return reject(err);
                }
                resolve(rows);
            });
        });
    },


    // Adiciona um paciente à fila de serviço.

    async addPatientToServiceQueue(patient_id: number, attendant_id: number, datetime: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO Service (attendant_id, patient_id, datetime, status)
                VALUES (?, ?, ?, 0)
            `;
            db.run(sql, [attendant_id, patient_id, datetime], function (err) {
                if (err) {
                    console.error('Erro ao adicionar paciente à fila de serviço:', err.message);
                    return reject(new Error('Erro ao adicionar paciente à fila de serviço.'));
                }
                resolve(this.lastID);
            });
        });
    },

    /**
     * Atualiza o status de um registro na fila de prioridade.
     * Esta é a função centralizada para esta operação.
     */
    async updatePriorityQueueStatus(queueId: number, status: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE PriorityQueue SET status = ? WHERE queue_id = ?`;
            db.run(sql, [status, queueId], function (err) {
                if (err) {
                    console.error('Erro ao atualizar status da fila de prioridade:', err.message);
                    return reject(new Error('Erro ao atualizar status da fila de prioridade.'));
                }
                if (this.changes === 0) {
                    return reject(new Error('Registro de fila não encontrado.'));
                }
                resolve();
            });
        });
    },

    // Insere um novo paciente na fila de prioridade.

    async insertIntoPriorityQueue(patient_id: number, datetime: string, status: number = 0): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO PriorityQueue (patient_id, datetime, status)
                VALUES (?, ?, ?)
            `;
            db.run(sql, [patient_id, datetime, status], function (err) {
                if (err) {
                    console.error('Erro ao inserir na fila de prioridade:', err.message);
                    return reject(new Error('Erro ao inserir na fila de prioridade.'));
                }
                resolve(this.lastID);
            });
        });
    },


    // Busca um registro da fila por ID.
    async getPriorityQueueById(queueId: number): Promise<any> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM PriorityQueue WHERE queue_id = ?`;
            db.get(sql, [queueId], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar registro da fila de prioridade:', err.message);
                    return reject(new Error('Erro ao buscar registro da fila de prioridade.'));
                }
                resolve(row);
            });
        });
    },


    // Remove um registro da fila de prioridade.

    async removeFromPriorityQueue(queueId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM PriorityQueue WHERE queue_id = ?`;
            db.run(sql, [queueId], function (err) {
                if (err) {
                    console.error('Erro ao remover da fila de prioridade:', err.message);
                    return reject(new Error('Erro ao remover da fila de prioridade.'));
                }
                if (this.changes === 0) {
                    return reject(new Error('Registro da fila de prioridade não encontrado.'));
                }
                resolve();
            });
        });
    },

    // Busca todos os registros da fila de prioridade.
    async getAllPriorityQueues(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM PriorityQueue`;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar todas as filas de prioridade:', err.message);
                    return reject(new Error('Erro ao buscar todas as filas de prioridade.'));
                }
                resolve(rows);
            });
        });
    },

    // Busca o histórico de um paciente na fila de prioridade.
    async getPatientQueueHistory(patient_id: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT PQ.*, P.patient_name
                FROM PriorityQueue PQ
                JOIN Patient P ON PQ.patient_id = P.patient_id
                WHERE PQ.patient_id = ?
                ORDER BY PQ.datetime DESC
            `;
            db.all(sql, [patient_id], (err, rows) => {
                if (err) {
                    console.error('Erro ao buscar histórico da fila de prioridade do paciente:', err.message);
                    return reject(new Error('Erro ao buscar histórico da fila de prioridade do paciente.'));
                }
                resolve(rows);
            });
        });
    },
};