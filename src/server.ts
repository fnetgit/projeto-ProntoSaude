import express from 'express';
import sqlite3 from 'sqlite3';
import { Patient } from './entities/patient'; // ESSA IMPORTAÇÃO É CRUCIAL PARA A TIPAGEM E ESTRUTURA DO CÓDIGO!
import path from 'path';

const app = express();
const port = 3000;

const dbPath = path.resolve(__dirname, '../database', 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log(`Conectado ao banco de dados SQLite em: ${dbPath}`);
        // As tabelas são assumidas como existentes e gerenciadas externamente.
        // Não há comandos CREATE TABLE aqui, pois você as gerencia fora deste código.
    }
});

app.use(express.json());
app.use(express.static('public'));
// Adiciona a pasta 'dist' como estática para servir os JS compilados do TypeScript
app.use('/dist', express.static('dist')); // Necessário para servir priority-queue.js

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

// Rota GET para buscar todos os pacientes (mantida).
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
// Ao chamar esta rota, o paciente é colocado na fila com STATUS = 0 (Aguardando Triagem).
app.post('/api/service', (req, res) => {
    console.log('Corpo da requisição recebido (adicionar à fila de serviço):', req.body);
    const { patient_id, attendant_id, datetime } = req.body;

    if (!patient_id || !attendant_id || !datetime) {
        return res.status(400).json({ message: 'ID do paciente, ID do atendente e data/hora são obrigatórios para o serviço.' });
    }

    // Incluindo a coluna 'status' com valor 0 (Aguardando Triagem)
    const sql = `INSERT INTO Service (patient_id, attendant_id, datetime, status) VALUES (?, ?, ?, ?)`;
    const params = [patient_id, attendant_id, datetime, 0]; // 0 = Aguardando Triagem

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Erro ao inserir na tabela Service:', err.message);
            return res.status(500).json({ message: 'Erro ao registrar serviço/adicionar à fila de triagem.' });
        }
        res.status(201).json({ message: 'Paciente adicionado à fila de triagem com sucesso!', serviceId: this.lastID });
    });
});

// Rota GET para buscar pacientes na fila de triagem (da tabela Service para o dia atual).
// Retorna apenas pacientes com STATUS = 0 (Aguardando Triagem).
app.get('/api/queue-patients', (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${year}-${month}-${day}`;
    
    // Status 0 significa "Aguardando Triagem" na tabela Service
    const statusAguardandoTriagem = 0; 

    console.log(`Buscando pacientes na fila de triagem para a data local: ${todayLocal} com status: ${statusAguardandoTriagem}`);

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
            S.service_id,
            S.status AS service_status -- Inclui o status do serviço
        FROM Service AS S
        JOIN Patient AS P ON S.patient_id = P.patient_id
        WHERE SUBSTR(S.datetime, 1, 10) = ? AND S.status = ? -- Filtra pelo status
        ORDER BY S.datetime ASC
    `;

    db.all(sql, [todayLocal, statusAguardandoTriagem], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pacientes na fila de triagem:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar pacientes na fila de triagem.' });
        }
        console.log('Pacientes encontrados na fila de triagem para hoje:', rows);
        res.status(200).json(rows);
    });
});

// Rota POST para registrar os dados da triagem na tabela Triage E ADICIONAR À FILA DE PRIORIDADE.
// Após registrar a triagem, o STATUS do paciente na tabela Service é atualizado para 1 (Triado).
app.post('/api/triage', (req, res) => {
    console.log('Corpo da requisição recebido (registrar triagem):', req.body);
    const {
        patient_id,
        service_id, // Recebemos o service_id do frontend para atualizar o status na tabela Service
        classification_id,
        datetime,
        blood_pressure,
        temperature,
        glucose,
        weight,
        oxygen_saturation,
        symptoms
    } = req.body;

    if (!patient_id || !service_id || !classification_id || !datetime ||
        !blood_pressure || temperature === undefined || glucose === undefined ||
        weight === undefined || oxygen_saturation === undefined || !symptoms) {
        return res.status(400).json({ message: 'Todos os campos de triagem são obrigatórios (incluindo service_id).' });
    }
    
    const triage_officer_id = req.body.triage_officer_id || 1; // Usando 1 como default se não vier do frontend

    // 1. Inserção na tabela Triage
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

    db.run(triageSql, triageParams, function (err) {
        if (err) {
            console.error('Erro ao inserir triagem:', err.message);
            return res.status(500).json({ message: 'Erro ao registrar triagem.' });
        }
        const triageId = this.lastID;
        console.log(`Triagem registrada com ID: ${triageId} para patient_id: ${patient_id}`);

        // 2. Inserção na tabela PriorityQueue
        const priorityQueueSql = `INSERT INTO PriorityQueue (patient_id, datetime, status) VALUES (?, ?, ?)`;
        const priorityQueueParams = [patient_id, datetime, 0]; // Status 0 = aguardando

        db.run(priorityQueueSql, priorityQueueParams, function (queueErr) {
            if (queueErr) {
                console.error('ERRO DETALHADO ao inserir na fila de prioridade:', queueErr); 
                console.error('Mensagem do erro na fila de prioridade (PriorityQueue):', queueErr.message);
                // NOTA: Mesmo com erro na PriorityQueue, a Triagem foi salva.
                // O frontend espera um 201 para continuar o fluxo.
                // Aqui, vamos tentar atualizar o Service de qualquer forma.
            } else {
                console.log(`Paciente ${patient_id} adicionado à PriorityQueue com sucesso.`);
            }

            // 3. ATUALIZAÇÃO DO STATUS NA TABELA SERVICE PARA 1 (Triado)
            console.log(`Tentando atualizar Service ID: ${service_id} para status 1 (Triado)...`);
            const updateServiceSql = `UPDATE Service SET status = ? WHERE service_id = ?`;
            const updateServiceParams = [1, service_id]; // 1 = Triado

            db.run(updateServiceSql, updateServiceParams, function (updateErr) {
                if (updateErr) {
                    console.error('Erro ao atualizar status na tabela Service após triagem:', updateErr.message);
                    return res.status(500).json({ message: `Triagem registrada, mas erro ao finalizar serviço (status): ${updateErr.message}` });
                }
                if (this.changes === 0) {
                    console.warn(`Aviso: Nenhuma linha atualizada na tabela Service para service_id ${service_id}. Isso pode indicar que o service_id não foi encontrado ou já tinha o status.`);
                } else {
                    console.log(`Status do Service ID: ${service_id} atualizado para 1 (Triado). Rows affected: ${this.changes}`);
                }
                // Resposta de sucesso geral.
                res.status(201).json({ message: 'Triagem registrada, status do serviço atualizado e paciente adicionado à fila de prioridade!', triageId: triageId });
            });
        });
    });
});

// Rota para "remover" um paciente da fila de triagem (agora atualiza status na tabela Service para 2).
// Isso acontece quando o triador clica em "Remover" porque o paciente não compareceu.
app.delete('/api/queue/:serviceId', (req, res) => {
    const serviceId = req.params.serviceId;

    if (!serviceId) {
        return res.status(400).json({ message: 'ID do serviço é obrigatório para remover da fila.' });
    }

    // Atualiza o status para 2 (Não Compareceu) em vez de deletar o registro.
    console.log(`Tentando atualizar Service ID: ${serviceId} para status 2 (Não Compareceu)...`);
    const sql = `UPDATE Service SET status = ? WHERE service_id = ?`;
    const params = [2, serviceId]; // 2 = Não Compareceu

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`Erro ao atualizar status do serviço ${serviceId} para 'Não Compareceu':`, err.message);
            return res.status(500).json({ message: 'Erro ao marcar paciente como "Não Compareceu" na fila.' });
        }
        if (this.changes === 0) {
            console.warn(`Aviso: Nenhuma linha atualizada para Service ID ${serviceId} ao tentar marcar como 'Não Compareceu'. Pode não ter sido encontrado.`);
            return res.status(404).json({ message: 'Serviço não encontrado na fila para atualização.' });
        } else {
            console.log(`Status do Service ID: ${serviceId} atualizado para 2 (Não Compareceu). Rows affected: ${this.changes}`);
        }
        res.status(200).json({ message: 'Paciente marcado como "Não Compareceu" com sucesso!' });
    });
});

// Rota GET para buscar pacientes na fila de prioridade para o médico (e fila pública).
// Esta rota precisa fornecer dados completos para a PriorityQueue do frontend.
app.get('/api/medical-queue', (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayLocal = `${year}-${month}-${day}`;
    
    // Status 0 significa "aguardando" na PriorityQueue
    const statusWaitingPriorityQueue = 0; 

    console.log(`Buscando pacientes na fila médica para a data: ${todayLocal} e status: ${statusWaitingPriorityQueue}`);

    const sql = `
        SELECT
            PQ.queue_id,
            PQ.datetime AS queue_datetime, -- Data/hora que entrou na fila de prioridade
            PQ.status AS queue_status,     -- Status na fila de prioridade
            P.patient_id,
            P.patient_name,
            P.cpf,
            P.birth_date,
            P.phone,
            P.sus_card,
            T.triage_id,
            T.datetime AS triage_datetime, -- Data/hora da triagem
            T.blood_pressure,
            T.temperature,
            T.glucose,
            T.weight,
            T.oxygen_saturation,
            T.symptoms,
            C.color_name,
            C.level_order
        FROM PriorityQueue AS PQ
        JOIN Patient AS P ON PQ.patient_id = P.patient_id
        JOIN Triage AS T ON P.patient_id = T.patient_id AND SUBSTR(T.datetime, 1, 10) = ? 
        JOIN Classification AS C ON T.classification_id = C.classification_id
        WHERE SUBSTR(PQ.datetime, 1, 10) = ? AND PQ.status = ?
        ORDER BY C.level_order ASC, PQ.datetime ASC
    `;

    db.all(sql, [todayLocal, todayLocal, statusWaitingPriorityQueue], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pacientes na fila médica:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar pacientes na fila médica.' });
        }
        console.log('Pacientes encontrados na fila médica para hoje:', rows);
        res.status(200).json(rows);
    });
});

// Rota POST para registrar um atendimento médico na tabela Appointment (mantida).
app.post('/api/appointment', (req, res) => {
    console.log('Corpo da requisição recebido (registrar atendimento médico):', req.body);
    const { patient_id, doctor_id, datetime, observations } = req.body;

    if (!patient_id || !doctor_id || !datetime || !observations) {
        return res.status(400).json({ message: 'Todos os campos do atendimento são obrigatórios.' });
    }

    const sql = `INSERT INTO Appointment (patient_id, doctor_id, datetime, observations) VALUES (?, ?, ?, ?)`;
    const params = [patient_id, doctor_id, datetime, observations];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Erro ao inserir atendimento:', err.message);
            return res.status(500).json({ message: 'Erro ao registrar atendimento médico.' });
        }
        res.status(201).json({ message: 'Atendimento registrado com sucesso!', appointmentId: this.lastID });
    });
});

// Rota PUT para atualizar o status de um paciente na PriorityQueue (mantida).
app.put('/api/priority-queue/:queueId/status', (req, res) => {
    console.log('Corpo da requisição recebido (atualizar status fila prioridade):', req.body);
    const queueId = req.params.queueId;
    const { status } = req.body; // O novo status (ex: 1 para atendido)

    if (!queueId || status === undefined) {
        return res.status(400).json({ message: 'ID da fila e status são obrigatórios.' });
    }

    const sql = `UPDATE PriorityQueue SET status = ? WHERE queue_id = ?`;
    const params = [status, queueId];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`Erro ao atualizar status da fila de prioridade para ID ${queueId}:`, err.message);
            return res.status(500).json({ message: 'Erro ao atualizar status na fila de prioridade.' });
        }
        if (this.changes === 0) {
            console.warn(`Aviso: Nenhuma linha atualizada na fila de prioridade para ID ${queueId}.`);
            return res.status(404).json({ message: 'Registro na fila de prioridade não encontrado.' });
        }
        res.status(200).json({ message: `Status da fila de prioridade para ID ${queueId} atualizado para ${status} com sucesso!` });
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Pressione CTRL+C para parar.');
});
