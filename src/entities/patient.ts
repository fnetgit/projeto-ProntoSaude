import { Triage } from "./triage";

export class Patient {
  public triage?: Triage;

  constructor(
    public id: number,
    public birthplace: string,
    public patientName: string,
    public phone: string,
    public gender: string,
    public cpf: string,
    public birthDate: Date,
    public susCard: string,
    public motherName: string,
    public address: string
  ) { }
}
