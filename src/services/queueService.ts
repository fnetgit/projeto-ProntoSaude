// src/services/queueService.ts

import db from '../config/database';
// Importação da classe e interface PriorityQueue.
// Mantenha esta linha, pois ela é necessária para a função getPriorityQueueInOrder.
import { PriorityQueue, PatientInQueue } from '../queue/priority-queue';

interface QueueRow {
    queue_id: number;
    patient_id: number;
    patient_name: string;
    classification_id: number;
    color_name: string;
    level_order: number;
    queue_datetime: string;
    triage_datetime: string;
    queue_status: number;
    max_wait_minutes?: number;
    elapsed_minutes?: number;
    time_remaining?: number;
    triage_id?: number;
}

export const QueueService = {
    // Função original que usa a ordenação SQL.
    // Mantenha-a se for usada em outras partes do seu sistema.
    async getPriorityQueue(): Promise<QueueRow[]> {
        return new Promise((resolve, reject) => {
            const sql = `WITH LatestTriagePerPatient AS (
    SELECT
        triage_id,
        patient_id,
        classification_id,
        datetime AS triage_datetime,
        ROW_NUMBER() OVER(PARTITION BY patient_id ORDER BY datetime DESC, triage_id DESC) as rn_triage
    FROM
        Triage
),
LatestPriorityQueueEntry AS (
    SELECT
        queue_id,
        patient_id,
        datetime AS queue_datetime,
        status AS queue_status,
        ROW_NUMBER() OVER(PARTITION BY patient_id ORDER BY datetime DESC, queue_id DESC) as rn_pq
    FROM
        PriorityQueue
    WHERE status IN (0, 1)
)
SELECT
    LPQE.queue_id,
    LPQE.patient_id,
    P.patient_name,
    P.birth_date,
    P.gender,
    LTPP.triage_id,
    LTPP.triage_datetime,
    C.color_name,
    C.level_order,
    LPQE.queue_datetime,
    LPQE.queue_status,
    CASE C.level_order
        WHEN 1 THEN 0
        WHEN 2 THEN 10
        WHEN 3 THEN 60
        WHEN 4 THEN 120
        WHEN 5 THEN 240
        ELSE 9999
    END AS max_wait_minutes,
    CAST((JULIANDAY('now') - JULIANDAY(LPQE.queue_datetime)) * 1440 AS INTEGER) AS elapsed_minutes,
    CAST((CASE C.level_order
        WHEN 1 THEN 0
        WHEN 2 THEN 10
        WHEN 3 THEN 60
        WHEN 4 THEN 120
        WHEN 5 THEN 240
        ELSE 9999
    END - (JULIANDAY('now') - JULIANDAY(LPQE.queue_datetime)) * 1440) AS INTEGER) AS time_remaining
FROM
    LatestPriorityQueueEntry AS LPQE
JOIN
    Patient AS P ON LPQE.patient_id = P.patient_id
JOIN
    LatestTriagePerPatient AS LTPP ON LPQE.patient_id = LTPP.patient_id
JOIN
    Classification AS C ON LTPP.classification_id = C.classification_id
WHERE
    LPQE.rn_pq = 1
    AND LTPP.rn_triage = 1
ORDER BY
    CASE WHEN C.level_order = 1 THEN 1 ELSE 2 END ASC,
    time_remaining ASC,
    C.level_order ASC,
    LPQE.queue_datetime ASC;
            `;

            db.all(sql, [], (err, rows: QueueRow[]) => {
                if (err) {
                    console.error('Erro ao buscar pacientes na fila de prioridade:', err.message);
                    return reject(new Error('Erro ao buscar pacientes na fila de prioridade.'));
                }
                resolve(rows);
            });
        });
    },

    // NOVA FUNÇÃO: Usa a classe PriorityQueue para ordenação em memória.
    async getPriorityQueueInOrder(): Promise<PatientInQueue[]> {
        return new Promise((resolve, reject) => {
            // SQL simplificado, sem a ordenação
            const sql = `WITH LatestTriagePerPatient AS (
    SELECT
        triage_id,
        patient_id,
        classification_id,
        datetime AS triage_datetime,
        ROW_NUMBER() OVER(PARTITION BY patient_id ORDER BY datetime DESC, triage_id DESC) as rn_triage
    FROM
        Triage
),
LatestPriorityQueueEntry AS (
    SELECT
        queue_id,
        patient_id,
        datetime AS queue_datetime,
        status AS queue_status,
        ROW_NUMBER() OVER(PARTITION BY patient_id ORDER BY datetime DESC, queue_id DESC) as rn_pq
    FROM
        PriorityQueue
    WHERE status IN (0, 1)
)
SELECT
    LPQE.queue_id,
    LPQE.patient_id,
    P.patient_name,
    LTPP.classification_id,
    C.color_name,
    C.level_order,
    LPQE.queue_datetime,
    LPQE.queue_status
FROM
    LatestPriorityQueueEntry AS LPQE
JOIN
    Patient AS P ON LPQE.patient_id = P.patient_id
JOIN
    LatestTriagePerPatient AS LTPP ON LPQE.patient_id = LTPP.patient_id
JOIN
    Classification AS C ON LTPP.classification_id = C.classification_id
WHERE
    LPQE.rn_pq = 1
    AND LTPP.rn_triage = 1;
            `;

            db.all(sql, [], (err, rows: QueueRow[]) => {
                if (err) {
                    console.error('Erro ao buscar pacientes para a fila de prioridade:', err.message);
                    return reject(new Error('Erro ao buscar pacientes.'));
                }

                // Cria uma instância da fila de prioridade (aqui a classe é usada)
                const priorityQueue = new PriorityQueue();

                // Insere cada paciente na fila usando o mapeamento correto.
                rows.forEach(row => {
                    const patient: PatientInQueue = {
                        patientName: row.patient_name,
                        priority: row.level_order,
                        queue_id: row.queue_id,
                        patient_id: row.patient_id,
                        color_name: row.color_name,
                        queue_datetime: row.queue_datetime,
                        queue_status: row.queue_status
                    };
                    priorityQueue.insert(patient);
                });

                // Obtém a lista ordenada pela lógica do heap
                const orderedPatients = priorityQueue.list();

                resolve(orderedPatients);
            });
        });
    },

    async addPatientToServiceQueue(patient_id: number, attendant_id: number, datetime: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO Service (patient_id, attendant_id, datetime, status) VALUES (?, ?, ?, ?)`;
            db.run(sql, [patient_id, attendant_id, datetime, 0], function (err) {
                if (err) {
                    return reject(new Error('Erro ao adicionar à fila de triagem.'));
                }
                resolve(this.lastID);
            });
        });
    }
};