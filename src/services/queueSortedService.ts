// src/services/queueSortedService.ts

import { PriorityQueue, PatientInQueue } from '../queue/priority-queue';
import { QueueService } from './queueService';

export const QueueSortedService = {
    async getPatientsOrderedByPriority(): Promise<PatientInQueue[]> {
        const rawPatients = await QueueService.getPriorityQueueInOrder();

        const priorityQueue = new PriorityQueue();
        rawPatients.forEach((p: any) => {
            priorityQueue.insert({
                patient_name: p.patient_name,
                priority: p.priority,
                queue_id: p.queue_id,
                patient_id: p.patient_id,
                color_name: p.color_name,
                queue_datetime: p.queue_datetime,
                queue_status: p.queue_status,
                triage_datetime: p.triage_datetime,
                triage_id: p.triage_id
            });
        });

        const orderedList = priorityQueue.list();
        console.log('Lista ordenada pela heap:', orderedList);
        return orderedList;
    }
};