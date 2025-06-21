// public/_js/queue.js

document.addEventListener('DOMContentLoaded', () => {
    const queueBody = document.getElementById('queue-body');

    async function fetchPriorityQueue() {
        try {
            const response = await fetch('/api/priority-queue');
            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status}`);
            }
            const patients = await response.json();
            displayQueue(patients);
        } catch (error) {
            console.error('Erro ao buscar a fila de prioridade:', error);
            queueBody.innerHTML = '<tr><td colspan="5">Erro ao carregar a fila de atendimento.</td></tr>';
        }
    }

    function getPriorityBadgeClass(colorName) {
        switch (colorName.toLowerCase()) {
            case 'vermelho': return 'priority-red';
            case 'laranja': return 'priority-orange';
            case 'amarelo': return 'priority-yellow';
            case 'verde': return 'priority-green';
            case 'azul': return 'priority-blue';
            default: return 'priority-grey'; // Cor padrão para casos não definidos
        }
    }

    function getPriorityText(colorName) {
        switch (colorName.toLowerCase()) {
            case 'vermelho': return 'Emergência';
            case 'laranja': return 'Muito Urgente';
            case 'amarelo': return 'Urgente';
            case 'verde': return 'Pouco Urgente';
            case 'azul': return 'Não Urgente';
            default: return 'Desconhecido';
        }
    }

    function displayQueue(patients) {
        queueBody.innerHTML = ''; // Limpa o conteúdo atual da tabela

        if (patients.length === 0) {
            queueBody.innerHTML = '<tr><td colspan="5">Nenhum paciente na fila de atendimento.</td></tr>';
            return;
        }

        patients.forEach((patient, index) => {
            const row = document.createElement('tr');

            // Formatando a data e hora
            const date = new Date(patient.queue_datetime);
            const formattedDate = date.toLocaleDateString('pt-BR');
            const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            row.innerHTML = `
                <td>${(index + 1).toString().padStart(3, '0')}</td>
                <td>${patient.patientName}</td>
                <td>
                    <span class="priority-badge ${getPriorityBadgeClass(patient.color_name)}">
                        ${getPriorityText(patient.color_name)}
                    </span>
                </td>
                <td>Aguardando Atendimento</td>
                <td>${formattedDate} ${formattedTime}</td>
            `;
            queueBody.appendChild(row);
        });
    }

    // Carrega a fila quando a página é carregada
    fetchPriorityQueue();

    // Opcional: Atualizar a fila a cada X segundos para ter dados mais recentes
    // setInterval(fetchPriorityQueue, 15000); // Atualiza a cada 15 segundos
});