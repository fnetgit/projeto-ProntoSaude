export interface PatientInQueue {
  patientName: string;
  priority: number;
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

  private bubbleUp(i: number) {
    while (
      i > 0 &&
      this.heap[this.parentIndex(i)].priority > this.heap[i].priority
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
      this.heap[left].priority < this.heap[smallest].priority
    )
      smallest = left;

    if (
      right < this.heap.length &&
      this.heap[right].priority < this.heap[smallest].priority
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
    return [...this.heap];
  }
}
