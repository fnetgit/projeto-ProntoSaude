import { Patient } from "../entities/patient";
import { Triage } from "../entities/triage";

export class Trier {
  private triagerId: number;
  private triagerName: string;

  constructor(name: string) {
    this.triagerId = Date.now();
    this.triagerName = name;
  }

  public setPriority(
    patient: Patient,
    symptoms: string,
    temperature: number,
    weight: number,
    oxygenSaturation: number,
    glucose: number,
    bloodPressure: string,
    wristbandColor: string
  ): { triageId: number; triagerName: string } {
    const priority = Triage.colorToPriority(wristbandColor);

    const triage = new Triage(
      patient.id,
      Date.now(),
      this.triagerId,
      symptoms,
      temperature,
      weight,
      oxygenSaturation,
      glucose,
      bloodPressure,
      wristbandColor,
      new Date()
    );

    patient.triage = triage;

    return {
      triageId: triage.idTriage,
      triagerName: this.triagerName,
    };
  }
}
