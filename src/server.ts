import express from 'express';
import sqlite3 from 'sqlite3';
import { Patient } from './entities/patient';
import path from 'path';

const app = express();
const port = 3000;

const dbPath = path.resolve(__dirname, '../database', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log(`Conectado ao banco de dados SQLite em: ${dbPath}`);
    }
});

app.use(express.json());
app.use(express.static('public'));

// Rota POST para cadastrar um novo paciente.
app.post('/api/pacientes', (req, res) => {
    console.log('Corpo da requisição recebido no backend (cadastro paciente):', req.body);

    const {
        patient_name,
        birth_date,
        cpf,
        birthplace,
        sus_card,
        address,
        mother_name,
        gender,
        phone,
    } = req.body;

    if (!patient_name || !birth_date || !cpf || !sus_card) {
        return res.status(400).json({ message: 'Nome completo, Data de Nascimento, CPF e Cartão do SUS são obrigatórios.' });
    }

    try {
        const newPatient = new Patient(
            0,
            birthplace,
            patient_name,
            phone,
            gender,
            cpf,
            new Date(birth_date),
            sus_card,
            mother_name,
            address
        );

        const sql = `INSERT INTO Patient (
            patient_name,
            cpf,
            birth_date,
            gender,
            phone,
            address,
            birthplace,
            sus_card,
            mother_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            newPatient.patientName,
            newPatient.cpf,
            newPatient.birthDate.toISOString().split('T')[0],
            newPatient.gender,
            newPatient.phone,
            newPatient.address,
            newPatient.birthplace,
            newPatient.susCard,
            newPatient.motherName
        ];

        db.run(sql, params, function (err) {
            if (err) {
                console.error('Erro ao inserir paciente:', err.message);

                if (err.message.includes('UNIQUE constraint failed: Patient.cpf')) {
                    return res.status(409).json({ message: 'CPF já cadastrado.' });
                }
                if (err.message.includes('UNIQUE constraint failed: Patient.sus_card')) {
                    return res.status(409).json({ message: 'Cartão do SUS já cadastrado.' });
                }
                return res.status(500).json({ message: 'Erro interno do servidor ao cadastrar paciente.' });
            }
            res.status(201).json({ message: 'Paciente cadastrado com sucesso!', patientId: this.lastID });
        });
    } catch (creationError) {
        console.error('Erro ao criar instância de Patient ou processar dados:', creationError);
        return res.status(400).json({ message: 'Dados do paciente inválidos ou incompletos para criação do objeto Patient.' });
    }
});

// Rota GET para buscar todos os pacientes.
app.get('/api/pacientes', (req, res) => {
    const sql = `SELECT
                    patient_id,
                    patient_name,
                    cpf,
                    birth_date,
                    gender,
                    phone,
                    address,
                    birthplace,
                    sus_card,
                    mother_name
                 FROM Patient`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pacientes:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar pacientes.' });
        }
        res.status(200).json(rows);
    });
});

// Rota POST para adicionar um paciente à tabela Service (fila de triagem).
app.post('/api/service', (req, res) => {
    console.log('Corpo da requisição recebido (adicionar à fila de serviço):', req.body);
    const { patient_id, attendant_id, datetime } = req.body;

    // Validação básica
    if (!patient_id || !attendant_id || !datetime) {
        return res.status(400).json({ message: 'ID do paciente, ID do atendente e data/hora são obrigatórios para o serviço.' });
    }

    const sql = `INSERT INTO Service (patient_id, attendant_id, datetime) VALUES (?, ?, ?)`;
    const params = [patient_id, attendant_id, datetime]; // datetime já deve vir no formato ISO string

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Erro ao inserir na tabela Service:', err.message);
            return res.status(500).json({ message: 'Erro ao registrar serviço/adicionar à fila de triagem.' });
        }
        res.status(201).json({ message: 'Paciente adicionado à fila de triagem com sucesso!', serviceId: this.lastID });
    });
});

// Rota GET para buscar pacientes na fila de triagem.
app.get('/api/queue-patients', (req, res) => {
    const today = new Date().toISOString().split('T')[0]; // Ex: '2023-10-27'

    const sql = `
        SELECT
            P.patient_id,
            P.patient_name,
            P.cpf,
            P.birth_date,
            P.gender,
            P.phone,
            P.sus_card,
            S.datetime AS service_datetime,
            S.service_id
        FROM Service AS S
        JOIN Patient AS P ON S.patient_id = P.patient_id
        WHERE SUBSTR(S.datetime, 1, 10) = ?
        ORDER BY S.datetime ASC
    `;

    db.all(sql, [today], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pacientes na fila de triagem:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar pacientes na fila de triagem.' });
        }
        res.status(200).json(rows);
    });
});

// Rota POST para registrar os dados da triagem na tabela Triage E ADICIONAR À FILA DE PRIORIDADE.
app.post('/api/triage', (req, res) => {
    console.log('Corpo da requisição recebido (registrar triagem):', req.body);
    const {
        patient_id,
        triage_officer_id,
        classification_id, // Este é o ID da prioridade (1-5)
        datetime, // Data e hora da triagem
        blood_pressure,
        temperature,
        glucose,
        weight,
        oxygen_saturation,
        symptoms
    } = req.body;

    // Validação básica dos campos da triagem
    if (!patient_id || !triage_officer_id || !classification_id || !datetime ||
        !blood_pressure || temperature === undefined || glucose === undefined ||
        weight === undefined || oxygen_saturation === undefined || !symptoms) {
        return res.status(400).json({ message: 'Todos os campos de triagem são obrigatórios.' });
    }

    // Query para inserir os dados na tabela Triage
    const triageSql = `INSERT INTO Triage (
        patient_id,
        triage_officer_id,
        classification_id,
        datetime,
        blood_pressure,
        temperature,
        glucose,
        weight,
        oxygen_saturation,
        symptoms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const triageParams = [
        patient_id,
        triage_officer_id,
        classification_id,
        datetime,
        blood_pressure,
        temperature,
        glucose,
        weight,
        oxygen_saturation,
        symptoms
    ];

    // Executa a inserção na tabela Triage
    db.run(triageSql, triageParams, function (err) {
        if (err) {
            console.error('Erro ao inserir triagem:', err.message);
            return res.status(500).json({ message: 'Erro ao registrar triagem.' });
        }
        const triageId = this.lastID; // ID da triagem recém-criada

        // *** AÇÃO PRINCIPAL: ADICIONAR O PACIENTE À FILA DE PRIORIDADE (PriorityQueue) ***
        // O status 0 significa "aguardando" (conforme a definição da sua tabela PriorityQueue)
        const priorityQueueSql = `INSERT INTO PriorityQueue (patient_id, datetime, status) VALUES (?, ?, ?)`;
        // Usa a mesma datetime da triagem para registrar a entrada na fila de prioridade
        const priorityQueueParams = [patient_id, datetime, 0]; 

        // Executa a inserção na tabela PriorityQueue
        db.run(priorityQueueSql, priorityQueueParams, function (queueErr) {
            if (queueErr) {
                console.error('Erro ao inserir na fila de prioridade:', queueErr.message);
                // É importante logar este erro. No entanto, se a triagem foi bem-sucedida,
                // podemos retornar um sucesso parcial ou um status de erro específico se a fila for crítica.
                // Aqui, optamos por retornar um erro 500 para indicar um problema no processo completo.
                return res.status(500).json({ message: 'Triagem registrada, mas erro ao adicionar paciente à fila de prioridade.' });
            }
            // Se ambas as inserções forem bem-sucedidas, retorna sucesso.
            res.status(201).json({ message: 'Triagem registrada e paciente adicionado à fila de prioridade com sucesso!', triageId: triageId });
        });
    });
});
// ROTA DELETE para remover um paciente da fila de serviço
app.delete('/api/queue/:serviceId', (req, res) => {
    const serviceId = req.params.serviceId; // Pega o service_id da URL

    if (!serviceId) {
        return res.status(400).json({ message: 'ID do serviço é obrigatório para remover da fila.' });
    }

    const sql = `DELETE FROM Service WHERE service_id = ?`;
    const params = [serviceId];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`Erro ao remover serviço ${serviceId} da fila:`, err.message);
            return res.status(500).json({ message: 'Erro ao remover paciente da fila.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Serviço não encontrado na fila.' });
        }
        res.status(200).json({ message: 'Paciente removido da fila com sucesso!' });
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Pressione CTRL+C para parar.');
});
