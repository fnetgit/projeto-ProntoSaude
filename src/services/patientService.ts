// src/services/patientService.ts

import db from '../config/database';
import { Patient } from '../entities/patient';

export const PatientService = {
    async createPatient(patient: Patient): Promise<number> {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO Patient (patient_name, cpf, birth_date, gender, phone, address, birthplace, sus_card, mother_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [
                patient.patientName,
                patient.cpf,
                patient.birthDate.toISOString().split('T')[0],
                patient.gender,
                patient.phone,
                patient.address,
                patient.birthplace,
                patient.susCard,
                patient.motherName
            ];
            db.run(sql, params, function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return reject(new Error('CPF ou Cartão do SUS já cadastrado.'));
                    }
                    return reject(new Error('Erro interno do servidor ao cadastrar paciente.'));
                }
                resolve(this.lastID);
            });
        });
    },

    async getAllPatients(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM Patient`;
            db.all(sql, [], (err, rows) => {
                if (err) {
                    return reject(new Error('Erro ao buscar pacientes.'));
                }
                resolve(rows);
            });
        });
    },

    async updatePatient(id: string, updatedData: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const fields = [
                'patient_name', 'birth_date', 'cpf', 'birthplace', 'sus_card',
                'address', 'mother_name', 'gender', 'phone'
            ];

            const setClauses: string[] = [];
            const params: any[] = [];

            fields.forEach(field => {
                if (updatedData[field] !== undefined) {
                    setClauses.push(`${field} = ?`);
                    if (field === 'birth_date' && updatedData[field] instanceof Date) {
                        params.push(updatedData[field].toISOString().split('T')[0]);
                    } else {
                        params.push(updatedData[field]);
                    }
                }
            });

            if (setClauses.length === 0) {
                return reject(new Error('Nenhum campo válido para atualizar.'));
            }

            const sql = `UPDATE Patient SET ${setClauses.join(', ')} WHERE patient_id = ?`;
            params.push(id);

            db.run(sql, params, function (err) {
                if (err) {
                    return reject(err);
                }
                if (this.changes === 0) {
                    return reject(new Error('Paciente não encontrado ou dados idênticos.'));
                }
                resolve();
            });
        });
    }
};