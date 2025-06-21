// server.ts

import express from 'express';
import sqlite3 from 'sqlite3';
import { Patient } from './entities/patient';
import { PriorityQueue, PatientInQueue } from './queues/priority-queue';
import path from 'path';

// Nova interface para o tipo de dado retornado pela consulta SQL da fila de prioridade
// ESTA É A LOCALIZAÇÃO CORRETA PARA A INTERFACE
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

// --- CORREÇÃO DO CAMINHO DOS ARQUIVOS ESTÁTICOS (CSS, JS) ---
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Rota principal para servir o triager.html
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'triager.html'));
});


// ========= TODAS AS SUAS ROTAS DE API - MANTIDAS E CORRIGIDAS =========

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

// Rota para cadastrar novo paciente (sua versão original com a classe Patient)
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

// Rota para buscar todos os pacientes
app.get('/api/pacientes', (req, res) => {
    const sql = `SELECT * FROM Patient`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pacientes:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar pacientes.' });
        }
        res.status(200).json(rows);
    });
});

// Rota para adicionar paciente à fila de serviço (antes da triagem)
app.post('/api/service', (req, res) => {
    const { patient_id, attendant_id, datetime } = req.body;
    if (!patient_id || !attendant_id || !datetime) {
        return res.status(400).json({ message: 'ID do paciente, atendente e data/hora são obrigatórios.' });
    }
    const sql = `INSERT INTO Service (patient_id, attendant_id, datetime, status) VALUES (?, ?, ?, ?)`;
    db.run(sql, [patient_id, attendant_id, datetime, 0], function (err) {
        if (err) {
            console.error('Erro ao inserir na tabela Service:', err.message);
            return res.status(500).json({ message: 'Erro ao adicionar à fila de triagem.' });
        }
        res.status(201).json({ message: 'Paciente adicionado à fila de triagem!', serviceId: this.lastID });
    });
});

// Rota para buscar pacientes aguardando triagem
app.get('/api/queue-patients', (req, res) => {
    const todayLocal = new Date().toISOString().split('T')[0];
    const sql = `
        SELECT S.service_id, S.datetime AS service_datetime, P.*
        FROM Service AS S JOIN Patient AS P ON S.patient_id = P.patient_id
        WHERE DATE(S.datetime) = ? AND S.status = 0 ORDER BY S.datetime ASC`;
    db.all(sql, [todayLocal], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pacientes na fila:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar pacientes na fila de triagem.' });
        }
        res.status(200).json(rows);
    });
});

// Rota para registrar a triagem
app.post('/api/triage', (req, res) => {
    const { patient_id, service_id, classification_id, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms } = req.body;
    if (!patient_id || !service_id || !classification_id) {
        return res.status(400).json({ message: 'Dados essenciais da triagem estão faltando.' });
    }
    const datetime = new Date().toISOString();
    const triage_officer_id = 1; // Ou o ID do triador logado

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // 1. Inserir a nova triagem
        const triageSql = `INSERT INTO Triage (patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(triageSql, [patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms], function (err) {
            if (err) {
                console.error('Erro ao registrar triagem:', err.message);
                db.run('ROLLBACK;');
                return res.status(500).json({ message: 'Erro ao registrar triagem.' });
            }
            const triageId = this.lastID;

            // 2. Atualizar o status do Service para "Triado"
            const updateServiceSql = `UPDATE Service SET status = 1 WHERE service_id = ?`; // Status 1 = Triado
            db.run(updateServiceSql, [service_id], (err) => {
                if (err) {
                    console.error('Erro ao atualizar status do serviço:', err.message);
                    db.run('ROLLBACK;');
                    return res.status(500).json({ message: 'Erro ao atualizar status do serviço.' });
                }

                // 3. Gerenciar a entrada na PriorityQueue
                // Primeiro, verificar se o paciente já está na PriorityQueue com status 0 (aguardando)
                const checkPriorityQueueSql = `SELECT queue_id FROM PriorityQueue WHERE patient_id = ? AND status = 0`;
                db.get(checkPriorityQueueSql, [patient_id], (err, row: { queue_id: number } | undefined) => { // Tipagem para o 'row' do db.get
                    if (err) {
                        console.error('Erro ao verificar PriorityQueue:', err.message);
                        db.run('ROLLBACK;');
                        return res.status(500).json({ message: 'Erro ao verificar fila de prioridade.' });
                    }

                    if (row) {
                        // Se o paciente já está na fila de prioridade, atualiza o datetime (ou pode apenas ignorar se não quiser atualizar)
                        const updatePriorityQueueSql = `UPDATE PriorityQueue SET datetime = ?, status = 0 WHERE queue_id = ?`;
                        db.run(updatePriorityQueueSql, [datetime, row.queue_id], (err) => {
                            if (err) {
                                console.error('Erro ao atualizar PriorityQueue existente:', err.message);
                                db.run('ROLLBACK;');
                                return res.status(500).json({ message: 'Erro ao atualizar fila de prioridade.' });
                            }
                            db.run('COMMIT;');
                            res.status(201).json({ message: 'Triagem registrada e fila de atendimento atualizada!', triageId });
                        });
                    } else {
                        // Se o paciente NÃO está na fila de prioridade, insere
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


// Rota para marcar paciente como "Não Compareceu"
app.delete('/api/queue/:serviceId', (req, res) => {
    const { serviceId } = req.params;
    const sql = `UPDATE Service SET status = 2 WHERE service_id = ?`; // Status 2 = Não Compareceu
    db.run(sql, [serviceId], function (err) {
        if (err) { return res.status(500).json({ message: 'Erro ao remover paciente da fila.' }); }
        if (this.changes === 0) { return res.status(404).json({ message: 'Serviço não encontrado.' }); }
        res.status(200).json({ message: 'Paciente marcado como "Não Compareceu".' });
    });
});


// Rota para buscar e ordenar a fila de prioridade
app.get('/api/priority-queue', (req, res) => {
    // Seleciona pacientes na fila de prioridade com status 0 (aguardando atendimento)
    // Garante que a triagem mais recente seja usada para a classificação
    const sql = `
        SELECT
            PQ.queue_id,
            PQ.patient_id,
            P.patient_name,
            T.classification_id,
            C.color_name,
            C.level_order,
            PQ.datetime AS queue_datetime,
            T.datetime AS triage_datetime, -- Adicionado para fins de depuração/exibição se necessário
            PQ.status AS queue_status
        FROM
            PriorityQueue AS PQ
        JOIN
            Patient AS P ON PQ.patient_id = P.patient_id
        LEFT JOIN
            Triage AS T ON PQ.patient_id = T.patient_id
        LEFT JOIN (
            SELECT patient_id, MAX(datetime) as max_triage_datetime
            FROM Triage
            GROUP BY patient_id
        ) AS LatestTriage ON T.patient_id = LatestTriage.patient_id AND T.datetime = LatestTriage.max_triage_datetime
        JOIN
            Classification AS C ON T.classification_id = C.classification_id
        WHERE
            PQ.status = 0 -- Apenas pacientes aguardando atendimento
            AND T.triage_id IS NOT NULL -- Garante que há uma triagem associada
        ORDER BY
            C.level_order ASC, -- Menor level_order = maior prioridade
            PQ.datetime ASC;   -- Em caso de mesma prioridade, quem entrou na fila antes
    `;

    db.all(sql, [], (err, rows: QueueRow[]) => { // AQUI, 'rows: QueueRow[]' é o que queremos
        if (err) {
            console.error('Erro ao buscar pacientes na fila de prioridade:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar pacientes na fila de prioridade.' });
        }

        // Criar uma instância da PriorityQueue
        const priorityQueue = new PriorityQueue();

        // Popular a PriorityQueue com os dados do banco
        rows.forEach(row => {
            priorityQueue.insert({
                queue_id: row.queue_id,
                patient_id: row.patient_id,
                patientName: row.patient_name,
                priority: row.level_order,
                color_name: row.color_name,
                queue_datetime: row.queue_datetime
            });
        });

        // Retorna a lista ordenada da PriorityQueue (já está ordenada pela consulta SQL)
        res.status(200).json(priorityQueue.list());
    });
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
