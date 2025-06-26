// src/queue/priority-queue.ts

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

  // Tempo máximo em minutos para cada cor, baseado no protocolo Manchester:
  private maxAllowedMinutesByColor: Record<string, number> = {
    vermelho: 0,  // Emergência - prioridade máxima
    laranja: 10,  // Muito urgente
    amarelo: 60,  // Urgente
    verde: 120,   // Pouco urgente
    azul: 240     // Não urgente
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

  // Calcula o tempo que um paciente está esperando em minutos.
  private getWaitedMinutes(patient: PatientInQueue): number {
    if (!patient.queue_datetime) return 0;
    const now = new Date();
    const enteredDate = new Date(patient.queue_datetime);
    return (now.getTime() - enteredDate.getTime()) / 60000;
  }

  /**
   * Calcula um score de prioridade dinâmico para o paciente,
   * combinando a prioridade original com o tempo de espera.
   * Um score menor indica maior urgência.
   */
  private getDynamicPriorityScore(patient: PatientInQueue): number {
    const waitedMinutes = this.getWaitedMinutes(patient);

    // O fator de decaimento determina o quão rápido a prioridade "cai" com o tempo.
    // Quanto menor o número, maior o impacto do tempo de espera.
    // Ex: um fator de 10 significa que 10 minutos de espera diminuem a prioridade em 1 ponto.
    const decayFactor = 10.0;

    return patient.priority - (waitedMinutes / decayFactor);
  }

  // Compara dois pacientes na fila, baseando-se em seu score de prioridade dinâmico.
  private comparePatients(a: PatientInQueue, b: PatientInQueue): boolean {
    const scoreA = this.getDynamicPriorityScore(a);
    const scoreB = this.getDynamicPriorityScore(b);

    // 1) Score menor é mais urgente.
    if (scoreA < scoreB) return true;
    if (scoreA > scoreB) return false;

    // 2) Se os scores forem iguais, o desempate é feito pela data de entrada (FIFO).
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

  // Retorna uma lista ordenada com base no score de prioridade dinâmico.
  public list(): PatientInQueue[] {
    return [...this.heap].sort((a, b) => {
      const scoreA = this.getDynamicPriorityScore(a);
      const scoreB = this.getDynamicPriorityScore(b);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      // Caso os scores sejam iguais, ordenar pela data de entrada
      if (a.queue_datetime && b.queue_datetime)
        return new Date(a.queue_datetime).getTime() - new Date(b.queue_datetime).getTime();

      return 0;
    });
  }
}