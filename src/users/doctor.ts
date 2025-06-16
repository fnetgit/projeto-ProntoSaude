import { PatientInQueue } from "../queues/priority-queue";

export class Doctor {
  constructor(private name: string) { }

  public performService(patient: PatientInQueue) {
    console.log(
      `Médico ${this.name} está atendendo ${patient.patientName} (prioridade ${patient.priority})`
    );
  }

  public getName(): string {
    return this.name;
  }
}
