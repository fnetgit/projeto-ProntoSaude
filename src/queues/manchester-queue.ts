import { PriorityQueue, PatientInQueue } from "./priority-queue";

export class ManchesterQueue {
  private redQueue = new PriorityQueue();
  private orangeQueue = new PriorityQueue();
  private yellowQueue = new PriorityQueue();
  private greenQueue = new PriorityQueue();
  private blueQueue = new PriorityQueue();

  public insert(patient: PatientInQueue) {
    switch (patient.priority) {
      case 1:
        this.redQueue.insert(patient);
        break;
      case 2:
        this.orangeQueue.insert(patient);
        break;
      case 3:
        this.yellowQueue.insert(patient);
        break;
      case 4:
        this.greenQueue.insert(patient);
        break;
      case 5:
        this.blueQueue.insert(patient);
        break;
      default:
        throw new Error(
          "Prioridade inválida. Deve ser de 1 (vermelho) a 5 (azul)."
        );
    }
  }

  public remove(): PatientInQueue | undefined {
    return (
      this.redQueue.remove() ||
      this.orangeQueue.remove() ||
      this.yellowQueue.remove() ||
      this.greenQueue.remove() ||
      this.blueQueue.remove()
    );
  }

  public list(): PatientInQueue[] {
    return [
      ...this.redQueue.list(),
      ...this.orangeQueue.list(),
      ...this.yellowQueue.list(),
      ...this.greenQueue.list(),
      ...this.blueQueue.list(),
    ];
  }
}
