export interface PatientInQueue {
  patient_name: string;
  priority: number;
  queue_id?: number;
  patient_id?: number;
  color_name?: string;
  queue_datetime?: string;
  queue_status?: number;
  triage_datetime?: string;
  triage_id?: number;
}

export class PriorityQueue {
  private heap: PatientInQueue[] = [];

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

  private getWaitedMinutes(patient: PatientInQueue): number {
    if (!patient.queue_datetime) return 0;
    const now = new Date();
    const enteredDate = new Date(patient.queue_datetime);
    return (now.getTime() - enteredDate.getTime()) / 60000;
  }

  private getDynamicPriorityScore(patient: PatientInQueue): number {
    const waitedMinutes = this.getWaitedMinutes(patient);

    const decayFactor = 10.0;

    return patient.priority - (waitedMinutes / decayFactor);
  }

  private comparePatients(a: PatientInQueue, b: PatientInQueue): boolean {
    const scoreA = this.getDynamicPriorityScore(a);
    const scoreB = this.getDynamicPriorityScore(b);

    if (scoreA < scoreB) return true;
    if (scoreA > scoreB) return false;

    if (a.queue_datetime && b.queue_datetime) {
      return new Date(a.queue_datetime) < new Date(b.queue_datetime);
    }

    return false;
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
    return [...this.heap].sort((a, b) => {
      const scoreA = this.getDynamicPriorityScore(a);
      const scoreB = this.getDynamicPriorityScore(b);

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      if (a.queue_datetime && b.queue_datetime)
        return new Date(a.queue_datetime).getTime() - new Date(b.queue_datetime).getTime();

      return 0;
    });
  }
}