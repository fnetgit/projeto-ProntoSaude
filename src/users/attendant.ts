import { Patient } from "../entities/patient";

const attendants: { attendantId: number; attendantName: string }[] = [];
let nextAttendantId = 1;
let nextPatientId = 1;
const patients: Patient[] = [];

export class Attendant {
  private attendantId: number;
  private attendantName: string;

  constructor(name: string) {
    this.attendantId = nextAttendantId++;
    this.attendantName = name;
    attendants.push({
      attendantId: this.attendantId,
      attendantName: this.attendantName,
    });
  }

  public registerPatient(
    birthplace: string,
    patientName: string,
    phone: string,
    gender: string,
    cpf: string,
    birthDate: Date,
    susCard: string,
    motherName: string,
    address: string
  ): Patient {
    const newPatient = new Patient(
      nextPatientId++,
      birthplace,
      patientName,
      phone,
      gender,
      cpf,
      birthDate,
      susCard,
      motherName,
      address
    );
    patients.push(newPatient);
    console.log(
      `→ Paciente ${patientName} cadastrado por ${this.attendantName}`
    );
    return newPatient;
  }
}
