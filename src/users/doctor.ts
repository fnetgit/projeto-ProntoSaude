// src/users/doctor.ts

import { openDb } from "../utils/db";

export class Doctor {
  public doctorId: number;
  public name: string;
  public specialty: string;
  public crm: string;

  constructor(doctorId: number, name: string, specialty: string, crm: string) {
    this.doctorId = doctorId;
    this.name = name;
    this.specialty = specialty;
    this.crm = crm;
  }

  static async create(name: string, specialty: string, crm: string): Promise<Doctor> {
    const db = await openDb();
    const result = await db.run(
      "INSERT INTO Doctor (doctor_name, specialty, crm) VALUES (?, ?, ?)",
      name,
      specialty,
      crm
    );
    if (typeof result.lastID !== "number") {
      throw new Error("Erro ao criar Doctor: lastID indefinido");
    }
    return new Doctor(result.lastID, name, specialty, crm);
  }

  static async findById(id: number): Promise<Doctor | null> {
    const db = await openDb();
    const doc = await db.get(
      "SELECT doctor_id, doctor_name, specialty, crm FROM Doctor WHERE doctor_id = ?",
      id
    );
    return doc
      ? new Doctor(doc.doctor_id, doc.doctor_name, doc.specialty, doc.crm)
      : null;
  }

  public getName(): string {
    return this.name;
  }

  async performService(patientId: number, attendantId: number): Promise<void> {
    const db = await openDb();
    await db.run(
      `INSERT INTO Service (attendant_id, patient_id, datetime, status)
       VALUES (?, ?, DATETIME('now'), 1)`,
      attendantId,
      patientId
    );
    console.log(`Médico ${this.name} está atendendo paciente de ID ${patientId}`);
  }
}