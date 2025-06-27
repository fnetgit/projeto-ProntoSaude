import { Patient } from "../entities/patient";
import { openDb } from "../utils/db";

export class Trier {
  public triagerId: number;
  public triagerName: string;

  constructor(triagerId: number, triagerName: string) {
    this.triagerId = triagerId;
    this.triagerName = triagerName;
  }

  static async create(name: string): Promise<Trier> {
    const db = await openDb();
    const result = await db.run(
      "INSERT INTO TriageOfficer (triage_officer_name) VALUES (?)",
      name
    );
    if (typeof result.lastID !== "number") {
      throw new Error("Erro ao criar Trier: lastID indefinido");
    }
    return new Trier(result.lastID, name);
  }

  static async findById(id: number): Promise<Trier | null> {
    const db = await openDb();
    const tri = await db.get(
      "SELECT triage_officer_id, triage_officer_name FROM TriageOfficer WHERE triage_officer_id = ?",
      id
    );
    return tri ? new Trier(tri.triage_officer_id, tri.triage_officer_name) : null;
  }

  async setPriority(
    patient: Patient,
    symptoms: string,
    temperature: number,
    weight: number,
    oxygenSaturation: number,
    glucose: number,
    bloodPressure: string,
    wristbandColor: string
  ): Promise<{ triageId: number; triagerName: string }> {
    const db = await openDb();
    const classification = await db.get(
      "SELECT classification_id FROM Classification WHERE color_name = ?",
      wristbandColor
    );
    if (!classification) throw new Error("Cor de pulseira inválida");

    const result = await db.run(
      `INSERT INTO Triage
        (patient_id, triage_officer_id, classification_id, datetime, blood_pressure, temperature, glucose, weight, oxygen_saturation, symptoms)
        VALUES (?, ?, ?, DATETIME('now'), ?, ?, ?, ?, ?, ?)`,
      patient.id,
      this.triagerId,
      classification.classification_id,
      bloodPressure,
      temperature,
      glucose,
      weight,
      oxygenSaturation,
      symptoms
    );
    if (typeof result.lastID !== "number") {
      throw new Error("Erro ao criar Triage: lastID indefinido");
    }

    return {
      triageId: result.lastID,
      triagerName: this.triagerName,
    };
  }
}