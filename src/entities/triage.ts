export class Triage {
  constructor(
    public idPatient: number,
    public idTriage: number,
    public idTrier: number,
    public symptoms: string,
    public temperature: number,
    public weight: number,
    public oxygenSaturation: number,
    public glucose: number,
    public bloodPressure: string,
    public wristbandColor: string,
    public dateTime: Date
  ) {}

  public static colorToPriority(color: string): number {
    switch (color.toLowerCase()) {
      case "vermelho":
        return 1;
      case "laranja":
        return 2;
      case "amarelo":
        return 3;
      case "verde":
        return 4;
      case "azul":
        return 5;
      default:
        throw new Error(
          "Cor de pulseira inválida. Use: vermelho, laranja, amarelo, verde ou azul."
        );
    }
  }

  public static priorityToColor(priority: number): string {
    switch (priority) {
      case 1:
        return "vermelho";
      case 2:
        return "laranja";
      case 3:
        return "amarelo";
      case 4:
        return "verde";
      case 5:
        return "azul";
      default:
        throw new Error(
          "Prioridade inválida. Deve ser de 1 (vermelho) a 5 (azul)."
        );
    }
  }
}
