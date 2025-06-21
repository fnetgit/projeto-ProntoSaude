import express from 'express';
import sqlite3 from 'sqlite3';
import { Patient } from './entities/patient';
import path from 'path';

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
    const triage_officer_id = 1;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        const triageSql = `INSERT INTO Triage (patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(triageSql, [patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms], function (err) {
            if (err) { db.run('ROLLBACK;'); return res.status(500).json({ message: 'Erro ao registrar triagem.' }); }
            const triageId = this.lastID;
            const priorityQueueSql = `INSERT INTO PriorityQueue (patient_id, datetime, status) VALUES (?, ?, ?)`;
            db.run(priorityQueueSql, [patient_id, datetime, 0], (err) => {
                if (err) { db.run('ROLLBACK;'); return res.status(500).json({ message: 'Erro ao adicionar na fila de prioridade.' }); }
                const updateServiceSql = `UPDATE Service SET status = 1 WHERE service_id = ?`; // Status 1 = Triado
                db.run(updateServiceSql, [service_id], (err) => {
                    if (err) { db.run('ROLLBACK;'); return res.status(500).json({ message: 'Erro ao atualizar status do serviço.' }); }
                    db.run('COMMIT;');
                    res.status(201).json({ message: 'Triagem registrada e paciente na fila de atendimento!', triageId });
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

// Rota para o médico ver a fila de atendimento
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
        if (err) {
            console.error('Erro ao buscar fila médica:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar fila médica.' });
        }
        res.status(200).json(rows);
    });
});

// Rota para registrar o atendimento médico
app.post('/api/appointment', (req, res) => {
    const { patient_id, doctor_id, datetime, observations } = req.body;
    if (!patient_id || !doctor_id || !datetime) {
        return res.status(400).json({ message: 'Campos obrigatórios do atendimento faltando.' });
    }
    const sql = `INSERT INTO Appointment (patient_id, doctor_id, datetime, observations) VALUES (?, ?, ?, ?)`;
    db.run(sql, [patient_id, doctor_id, datetime, observations], function (err) {
        if (err) {
            return res.status(500).json({ message: 'Erro ao registrar atendimento.' });
        }
        res.status(201).json({ message: 'Atendimento registrado com sucesso!', appointmentId: this.lastID });
    });
});

// Rota para atualizar status na fila de prioridade (ex: médico chamou, foi atendido)
app.put('/api/priority-queue/:queueId/status', (req, res) => {
    const { queueId } = req.params;
    const { status } = req.body;
    if (status === undefined) {
        return res.status(400).json({ message: 'Status é obrigatório.' });
    }
    const sql = `UPDATE PriorityQueue SET status = ? WHERE queue_id = ?`;
    db.run(sql, [status, queueId], function (err) {
        if (err) {
            return res.status(500).json({ message: 'Erro ao atualizar status na fila.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Registro na fila não encontrado.' });
        }
        res.status(200).json({ message: 'Status da fila atualizado com sucesso.' });
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
