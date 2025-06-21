// server.ts

import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { Patient } from './entities/patient';
import { PriorityQueue } from './queues/priority-queue';

// Interface do segundo arquivo para tipagem segura
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
    // Novos campos para a lógica de prioridade por tempo (se necessário)
    max_wait_minutes?: number;
    elapsed_minutes?: number;
    time_remaining?: number;
    // Adicionado triage_id para buscar detalhes da triagem específica
    triage_id?: number;
}

// Interface para os detalhes completos da triagem (usada na nova rota)
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
    // Dados do paciente
    patient_name: string; // Garantindo que patient_name está aqui
    birth_date: string;
    gender: string;
    // Dados da classificação
    color_name: string;
    level_order: number;
}


const app = express();
const port = 3000;

const dbPath = path.resolve(__dirname, '..', 'database', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log(`Conectado ao banco de dados SQLite em: ${dbPath}`);
    }
});

app.use(express.json());

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// ========= ROTAS PARA SERVIR AS PÁGINAS HTML =========
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});

app.get('/triador', (req, res) => {
    res.sendFile(path.join(publicPath, 'triager.html'));
});

app.get('/atendente', (req, res) => {
    res.sendFile(path.join(publicPath, 'attendant.html'));
});

app.get('/medico', (req, res) => {
    res.sendFile(path.join(publicPath, 'doctor.html'));
});

app.get('/fila', (req, res) => {
    res.sendFile(path.join(publicPath, 'queue.html'));
});


// ========= ROTAS DE API =========

// Rota para buscar as classificações
app.get('/api/classifications', (req, res) => {
    const sql = `SELECT classification_id, color_name, level_order FROM Classification ORDER BY level_order ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar classificações:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar classificações.' });
        }
        res.status(200).json(rows);
    });
});

// Rotas de Pacientes e Service
app.post('/api/pacientes', (req, res) => {
    const { patient_name, birth_date, cpf, birthplace, sus_card, address, mother_name, gender, phone, } = req.body;
    if (!patient_name || !birth_date || !cpf || !sus_card) {
        return res.status(400).json({ message: 'Nome, Data de Nascimento, CPF e Cartão do SUS são obrigatórios.' });
    }
    try {
        const newPatient = new Patient(0, birthplace, patient_name, phone, gender, cpf, new Date(birth_date), sus_card, mother_name, address);
        const sql = `INSERT INTO Patient (patient_name, cpf, birth_date, gender, phone, address, birthplace, sus_card, mother_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [newPatient.patientName, newPatient.cpf, newPatient.birthDate.toISOString().split('T')[0], newPatient.gender, newPatient.phone, newPatient.address, newPatient.birthplace, newPatient.susCard, newPatient.motherName];
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Erro ao inserir paciente:', err.message);
                if (err.message.includes('UNIQUE')) { return res.status(409).json({ message: 'CPF ou Cartão do SUS já cadastrado.' }); }
                return res.status(500).json({ message: 'Erro interno do servidor ao cadastrar paciente.' });
            }
            res.status(201).json({ message: 'Paciente cadastrado com sucesso!', patientId: this.lastID });
        });
    } catch (creationError) {
        console.error('Erro ao criar instância de Patient:', creationError);
        return res.status(400).json({ message: 'Dados do paciente inválidos.' });
    }
});

app.get('/api/pacientes', (req, res) => {
    const sql = `SELECT * FROM Patient`;
    db.all(sql, [], (err, rows) => {
        if (err) { return res.status(500).json({ message: 'Erro ao buscar pacientes.' }); }
        res.status(200).json(rows);
    });
});

app.post('/api/service', (req, res) => {
    const { patient_id, attendant_id, datetime } = req.body;
    if (!patient_id || !attendant_id || !datetime) {
        return res.status(400).json({ message: 'ID do paciente, atendente e data/hora são obrigatórios.' });
    }
    const sql = `INSERT INTO Service (patient_id, attendant_id, datetime, status) VALUES (?, ?, ?, ?)`;
    db.run(sql, [patient_id, attendant_id, datetime, 0], function (err) {
        if (err) { return res.status(500).json({ message: 'Erro ao adicionar à fila de triagem.' }); }
        res.status(201).json({ message: 'Paciente adicionado à fila de triagem!', serviceId: this.lastID });
    });
});

app.get('/api/queue-patients', (req, res) => {
    const todayLocal = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT S.service_id, S.datetime AS service_datetime, P.*
        FROM Service AS S JOIN Patient AS P ON S.patient_id = P.patient_id
        WHERE DATE(S.datetime) = ? AND S.status = 0 ORDER BY S.datetime ASC`;
    db.all(sql, [todayLocal], (err, rows) => {
        if (err) { return res.status(500).json({ message: 'Erro ao buscar pacientes na fila de triagem.' }); }
        res.status(200).json(rows);
    });
});

// ROTA DE TRIAGEM
app.post('/api/triage', (req, res) => {
    const { patient_id, service_id, classification_id, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms } = req.body;
    if (!patient_id || !service_id || !classification_id) {
        return res.status(400).json({ message: 'Dados essenciais da triagem estão faltando.' });
    }
    const datetime = new Date().toISOString();
    const triage_officer_id = 1;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        const triageSql = `INSERT INTO Triage (patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(triageSql, [patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms], function (err) {
            if (err) {
                console.error('Erro ao registrar triagem:', err.message);
                db.run('ROLLBACK;');
                return res.status(500).json({ message: 'Erro ao registrar triagem.' });
            }
            const triageId = this.lastID;

            const updateServiceSql = `UPDATE Service SET status = 1 WHERE service_id = ?`;
            db.run(updateServiceSql, [service_id], (err) => {
                if (err) {
                    console.error('Erro ao atualizar status do serviço:', err.message);
                    db.run('ROLLBACK;');
                    return res.status(500).json({ message: 'Erro ao atualizar status do serviço.' });
                }

                const checkPriorityQueueSql = `SELECT queue_id FROM PriorityQueue WHERE patient_id = ? AND status = 0`;
                db.get(checkPriorityQueueSql, [patient_id], (err, row: { queue_id: number } | undefined) => {
                    if (err) {
                        console.error('Erro ao verificar fila de prioridade:', err.message);
                        db.run('ROLLBACK;');
                        return res.status(500).json({ message: 'Erro ao verificar fila de prioridade.' });
                    }

                    if (row) {
                        const updatePriorityQueueSql = `UPDATE PriorityQueue SET datetime = ?, status = 0 WHERE queue_id = ?`;
                        db.run(updatePriorityQueueSql, [datetime, row.queue_id], (err) => {
                            if (err) {
                                console.error('Erro ao atualizar fila de prioridade existente:', err.message);
                                db.run('ROLLBACK;');
                                return res.status(500).json({ message: 'Erro ao atualizar fila de prioridade.' });
                            }
                            db.run('COMMIT;');
                            res.status(201).json({ message: 'Triagem registrada e fila de atendimento atualizada!', triageId });
                        });
                    } else {
                        const insertPriorityQueueSql = `INSERT INTO PriorityQueue (patient_id, datetime, status) VALUES (?, ?, ?)`;
                        db.run(insertPriorityQueueSql, [patient_id, datetime, 0], (err) => {
                            if (err) {
                                console.error('Erro ao adicionar na fila de prioridade:', err.message);
                                db.run('ROLLBACK;');
                                return res.status(500).json({ message: 'Erro ao adicionar na fila de prioridade.' });
                            }
                            db.run('COMMIT;');
                            res.status(201).json({ message: 'Triagem registrada e paciente na fila de atendimento!', triageId });
                        });
                    }
                });
            });
        });
    });
});

// ROTA PARA A FILA DE ATENDIMENTO GERAL E DO MÉDICO (REUTILIZADA)
app.get('/api/priority-queue', (req, res) => {
    const sql = `
        WITH LatestTriagePerPatient AS (
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
            WHERE status IN (0, 1) -- Inclui pacientes aguardando (0) e em atendimento (1) para o médico
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
            return res.status(500).json({ message: 'Erro ao buscar pacientes na fila de prioridade.' });
        }
        // --- NOVO: ADICIONE ESTE CONSOLE.LOG AQUI ---
        console.log('Dados brutos da API /api/priority-queue:', rows);
        // --- FIM DO NOVO CONSOLE.LOG ---
        res.status(200).json(rows);
    });
});

// NOVA ROTA: Obter detalhes completos da triagem e dados do paciente
app.get('/api/triage-details/:patientId/:triageId', (req, res) => {
    const { patientId, triageId } = req.params;
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
            return res.status(500).json({ message: 'Erro ao buscar detalhes da triagem.' });
        }
        if (!row) {
            return res.status(404).json({ message: 'Detalhes da triagem não encontrados.' });
        }
        // --- NOVO: ADICIONE ESTE CONSOLE.LOG AQUI ---
        console.log('Dados brutos da API /api/triage-details:', row);
        // --- FIM DO NOVO CONSOLE.LOG ---
        res.status(200).json(row);
    });
});


app.delete('/api/queue/:serviceId', (req, res) => {
    const { serviceId } = req.params;
    const sql = `UPDATE Service SET status = 2 WHERE service_id = ?`; // Status 2 = Não Compareceu
    db.run(sql, [serviceId], function (err) {
        if (err) { return res.status(500).json({ message: 'Erro ao remover paciente da fila.' }); }
        if (this.changes === 0) { return res.status(404).json({ message: 'Serviço não encontrado.' }); }
        res.status(200).json({ message: 'Paciente marcado como "Não Compareceu".' });
    });
});

app.get('/api/medical-queue', (req, res) => {
    const todayLocal = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT PQ.*, P.patient_name, P.cpf, P.birth_date, C.color_name, C.level_order
        FROM PriorityQueue AS PQ JOIN Patient AS P ON PQ.patient_id = P.patient_id
        JOIN Triage AS T ON P.patient_id = T.patient_id AND DATE(T.datetime) = ?
        JOIN Classification AS C ON T.classification_id = C.classification_id
        WHERE DATE(PQ.datetime) = ? AND PQ.status = 0
        ORDER BY C.level_order ASC, PQ.datetime ASC`;
    db.all(sql, [todayLocal, todayLocal], (err, rows) => {
        if (err) { return res.status(500).json({ message: 'Erro ao buscar fila médica.' }); }
        res.status(200).json(rows);
    });
});

app.post('/api/appointment', (req, res) => {
    const { patient_id, doctor_id, datetime, observations } = req.body;
    if (!patient_id || !doctor_id || !datetime) {
        return res.status(400).json({ message: 'Campos obrigatórios do atendimento faltando.' });
    }
    const sql = `INSERT INTO Appointment (patient_id, doctor_id, datetime, observations) VALUES (?, ?, ?, ?)`;
    db.run(sql, [patient_id, doctor_id, datetime, observations], function (err) {
        if (err) {
            console.error('Erro ao registrar atendimento:', err.message);
            return res.status(500).json({ message: 'Erro ao registrar atendimento.' });
        }
        res.status(201).json({ message: 'Atendimento registrado com sucesso!', appointmentId: this.lastID });
    });
});

app.put('/api/priority-queue/:queueId/status', (req, res) => {
    const { queueId } = req.params;
    const { status } = req.body;
    if (status === undefined) { return res.status(400).json({ message: 'Status é obrigatório.' }); }
    const sql = `UPDATE PriorityQueue SET status = ? WHERE queue_id = ?`;
    db.run(sql, [status, queueId], function (err) {
        if (err) {
            console.error('Erro ao atualizar status na fila:', err.message);
            return res.status(500).json({ message: 'Erro ao atualizar status na fila.' });
        }
        if (this.changes === 0) { return res.status(404).json({ message: 'Registro na fila não encontrado.' }); }
        res.status(200).json({ message: 'Status da fila atualizado com sucesso.' });
    });
});


// Bloco listen
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Página de Login: http://localhost:${port}/`);
    console.log(`Página do Atendente: http://localhost:${port}/atendente`);
    console.log(`Página do Triador: http://localhost:${port}/triador`);
    console.log(`Página do Médico: http://localhost:${port}/medico`);
});
