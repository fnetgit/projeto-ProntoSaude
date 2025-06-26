export interface PatientInQueue {
  patient_name: string;
  priority: number;         // nível numérico da prioridade (ex: 1, 2, 3...)
  queue_id?: number;
  patient_id?: number;
  color_name?: string;      // ex: 'vermelho', 'amarelo', 'azul' ...
  queue_datetime?: string;  // string ISO ou compatível para Date
  queue_status?: number;
  triage_datetime?: string;
  triage_id?: number; 
}

export class PriorityQueue {
  private heap: PatientInQueue[] = [];

  // Tempo máximo em minutos para cada cor, baseado no protocolo Manchester (exemplo):
  private maxAllowedMinutesByColor: Record<string, number> = {
    vermelho: 0,      // Emergência - prioridade máxima
    laranja: 10,      // Muito urgente
    amarelo: 60,      // Urgente
    verde: 120,       // Pouco urgente
    azul: 240         // Não urgente
  };

  private parentIndex(i: number) {
    return Math.floor((i - 1) / 2);
  }
  private leftChildIndex(i: number) {
    return 2 * i + 1;
  }
  private rightChildIndex(i: number) {
    return 2 * i + 2;
  }

  private swap(i: number, j: number) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Função para calcular "tempo restante" em minutos
  private getTimeLeft(patient: PatientInQueue): number {
    if (!patient.queue_datetime || !patient.color_name) return Number.MAX_SAFE_INTEGER;

    const now = new Date();
    const enteredDate = new Date(patient.queue_datetime);
    const waitedMinutes = (now.getTime() - enteredDate.getTime()) / 60000;

    const maxMinutes = this.maxAllowedMinutesByColor[patient.color_name.toLowerCase()] ?? 9999;

    // tempo restante: quanto tempo falta para ultrapassar o limite
    return maxMinutes - waitedMinutes;
  }

  // Função para comparar dois pacientes na fila, considerando prioridade e tempo restante para desempate
  private comparePatients(a: PatientInQueue, b: PatientInQueue): boolean {
    // 1) Prioridade menor é mais urgente
    if (a.priority < b.priority) return true;
    if (a.priority > b.priority) return false;

    // 2) Se mesma prioridade, compara tempo restante (menor tempo restante = mais urgente)
    const timeLeftA = this.getTimeLeft(a);
    const timeLeftB = this.getTimeLeft(b);

    if (timeLeftA < timeLeftB) return true;
    if (timeLeftA > timeLeftB) return false;

    // 3) Se ainda empatado, quem entrou primeiro (queue_datetime menor)
    if (a.queue_datetime && b.queue_datetime) {
      return new Date(a.queue_datetime) < new Date(b.queue_datetime);
    }

    return false; // empate padrão
  }

  private bubbleUp(i: number) {
    while (
      i > 0 &&
      this.comparePatients(this.heap[i], this.heap[this.parentIndex(i)])
    ) {
      this.swap(i, this.parentIndex(i));
      i = this.parentIndex(i);
    }
  }

  private bubbleDown(i: number) {
    let smallest = i;
    const left = this.leftChildIndex(i);
    const right = this.rightChildIndex(i);

    if (
      left < this.heap.length &&
      this.comparePatients(this.heap[left], this.heap[smallest])
    )
      smallest = left;

    if (
      right < this.heap.length &&
      this.comparePatients(this.heap[right], this.heap[smallest])
    )
      smallest = right;

    if (smallest !== i) {
      this.swap(i, smallest);
      this.bubbleDown(smallest);
    }
  }

  public insert(p: PatientInQueue) {
    this.heap.push(p);
    this.bubbleUp(this.heap.length - 1);
  }

  public remove(): PatientInQueue | undefined {
    if (!this.heap.length) return undefined;
    const top = this.heap[0];
    const end = this.heap.pop()!;
    if (this.heap.length) {
      this.heap[0] = end;
      this.bubbleDown(0);
    }
    return top;
  }

  public list(): PatientInQueue[] {
    // Ordena pelo mesmo critério usado na heap:
    return [...this.heap].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;

      const timeLeftA = this.getTimeLeft(a);
      const timeLeftB = this.getTimeLeft(b);
      if (timeLeftA !== timeLeftB) return timeLeftA - timeLeftB;

      // Caso empate, ordenar pela data de entrada
      if (a.queue_datetime && b.queue_datetime)
        return new Date(a.queue_datetime).getTime() - new Date(b.queue_datetime).getTime();

      return 0;
    });
  }
}
