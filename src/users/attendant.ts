// src/users/attendant.ts

import { Patient } from "../entities/patient";
import { openDb } from "../utils/db";

export class Attendant {
  public attendantId: number;
  public attendantName: string;

  constructor(attendantId: number, attendantName: string) {
    this.attendantId = attendantId;
    this.attendantName = attendantName;
  }

  static async create(name: string): Promise<Attendant> {
    const db = await openDb();
    const result = await db.run(
      "INSERT INTO Attendant (attendant_name) VALUES (?)",
      name
    );
    if (typeof result.lastID !== "number") {
      throw new Error("Erro ao criar Attendant: lastID indefinido");
    }
    return new Attendant(result.lastID, name);
  }

  static async findById(id: number): Promise<Attendant | null> {
    const db = await openDb();
    const att = await db.get(
      "SELECT attendant_id, attendant_name FROM Attendant WHERE attendant_id = ?",
      id
    );
    return att ? new Attendant(att.attendant_id, att.attendant_name) : null;
  }

  async registerPatient(
    birthplace: string,
    patient_name: string,
    phone: string,
    gender: string,
    cpf: string,
    birthDate: Date,
    susCard: string,
    motherName: string,
    address: string
  ): Promise<Patient> {
    const db = await openDb();
    const result = await db.run(
      `INSERT INTO Patient 
        (patient_name, cpf, birth_date, gender, phone, address, birthplace, sus_card, mother_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      patient_name,
      cpf,
      birthDate.toISOString().slice(0, 10),
      gender,
      phone,
      address,
      birthplace,
      susCard,
      motherName
    );
    if (typeof result.lastID !== "number") {
      throw new Error("Erro ao criar Patient: lastID indefinido");
    }

    return new Patient(
      result.lastID,
      birthplace,
      patient_name,
      phone,
      gender,
      cpf,
      birthDate,
      susCard,
      motherName,
      address
    );
  }
}