document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Seleção dos Elementos HTML (IDs alinhados com triager.html) ---
    const secaoLista = document.getElementById('triage-queue-list'); // ID atualizado
    const secaoFormulario = document.getElementById('triage-data-form'); // ID atualizado
    const triageForm = document.querySelector('#triage-data-form .triage-form'); // Seletor atualizado
    const backToQueueButton = document.querySelector('#triage-data-form .back-button'); // Seletor atualizado
    const prioritySelect = document.getElementById('priority_classification');
    const tbodyTriageQueue = document.getElementById('triage-queue-body');

    // Elementos para exibir os dados do paciente no formulário de triagem
    const displayNameElement = document.getElementById('display-patient-name');
    const displayDobElement = document.getElementById('display-patient-dob');

    let currentPatientDataForTriage = null;

    // --- 2. Funções de Formatação (Reutilizadas) ---
    function formatCpf(cpf) {
        if (!cpf) return '';
        const cleaned = cpf.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    }

    // --- Funções Auxiliares para Cores de Prioridade ---
    function limparCoresPrioridade() {
        const wrapper = prioritySelect.closest('.select-wrapper');
        const classesDePrioridade = ['priority-red', 'priority-orange', 'priority-yellow', 'priority-green', 'priority-blue']; // Usar classes em inglês
        prioritySelect.classList.remove(...classesDePrioridade);
        if (wrapper) {
            wrapper.classList.remove(...classesDePrioridade, 'has-color');
        }
    }

    function actualizarCorPrioridade() {
        limparCoresPrioridade();
        const wrapper = prioritySelect.closest('.select-wrapper');
        const valor = prioritySelect.value;
        if (valor) {
            const novaClasse = `priority-${valor}`; // Ex: priority-red
            prioritySelect.classList.add(novaClasse);
            if (wrapper) {
                wrapper.classList.add(novaClasse, 'has-color');
            }
        }
    }

    // --- 3. Funções de Lógica de UI e Dados ---

    function mostrarFormulario(patient) {
        currentPatientDataForTriage = patient;
        
        displayNameElement.textContent = patient.patient_name;
        displayDobElement.textContent = `Data de Nascimento: ${patient.birth_date}`;

        secaoLista.style.display = 'none';
        secaoFormulario.style.display = 'block';
    }

    async function handleRemoveButtonClick(serviceId, patientName) {
        if (confirm(`Tem certeza que deseja remover ${patientName} da fila de triagem?`)) {
            try {
                const response = await fetch(`/api/queue/${serviceId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert(`${patientName} removido da fila com sucesso!`);
                    fetchAndRenderQueuePatients(); // Recarrega a fila
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao remover ${patientName} da fila: ${errorData.message || response.statusText}`);
                }
            } catch (error) {
                console.error('Erro de conexão ao remover paciente da fila:', error);
                alert('Erro de conexão ao tentar remover paciente da fila.');
            }
        }
    }

    async function fetchAndRenderQueuePatients() {
        if (!tbodyTriageQueue) {
            console.error('Elemento <tbody> da tabela de fila de triagem não encontrado.');
            return;
        }
        tbodyTriageQueue.innerHTML = '';

        try {
            const response = await fetch('/api/queue-patients');
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const patientsInQueue = await response.json();

            if (patientsInQueue.length === 0) {
                const row = tbodyTriageQueue.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 6;
                cell.textContent = 'Nenhum paciente na fila de triagem hoje.';
                cell.className = 'text-center text-gray-500 py-4';
                return;
            }

            patientsInQueue.forEach((patient, index) => {
                const row = tbodyTriageQueue.insertRow();
                row.dataset.patient = JSON.stringify(patient); 

                row.insertCell().textContent = patient.patient_name;
                row.insertCell().textContent = formatCpf(patient.cpf);
                row.insertCell().textContent = patient.sus_card;
                row.insertCell().textContent = formatPhone(patient.phone || '');
                row.insertCell().textContent = patient.birth_date;

                const actionCell = row.insertCell();
                const isFirst = index === 0;
                const buttonStatusClass = isFirst ? 'active' : 'inactive';
                const buttonText = isFirst ? 'Iniciar' : 'Aguardando';
                const buttonDisabled = !isFirst;

                actionCell.innerHTML = `
                    <button class="initiate-button ${buttonStatusClass}" ${buttonDisabled ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                    <button class="remove-button" data-service-id="${patient.service_id}" style="margin-left: 5px;">Remover</button>
                `;

                const initiateButton = actionCell.querySelector('.initiate-button');
                if (initiateButton && isFirst) {
                    initiateButton.addEventListener('click', () => mostrarFormulario(patient));
                }

                const removeButton = actionCell.querySelector('.remove-button');
                if (removeButton) {
                    removeButton.addEventListener('click', () => handleRemoveButtonClick(patient.service_id, patient.patient_name));
                }
            });
        } catch (error) {
            console.error('Erro ao buscar e renderizar pacientes na fila de triagem:', error);
            const row = tbodyTriageQueue.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.textContent = 'Erro ao carregar fila de triagem. Verifique o console para detalhes.';
            cell.className = 'text-center text-red-500 py-4';
        }
    }

    async function registrarTriagem(event) {
        event.preventDefault();

        const blood_pressure = document.getElementById('blood_pressure').value.trim();
        const temperature = parseFloat(document.getElementById('temperature').value.trim());
        const glucose = parseFloat(document.getElementById('glucose').value.trim());
        const weight = parseFloat(document.getElementById('weight').value.trim());
        const oxygen_saturation = parseFloat(document.getElementById('oxygen_saturation').value.trim());
        const symptoms = document.getElementById('symptoms').value.trim();
        const wristband_color = document.getElementById('priority_classification').value;

        if (!blood_pressure || isNaN(temperature) || isNaN(glucose) || isNaN(weight) || isNaN(oxygen_saturation) || !symptoms || !wristband_color) {
            alert('Por favor, preencha todos os campos obrigatórios da triagem.');
            return;
        }

        if (!currentPatientDataForTriage || !currentPatientDataForTriage.patient_id) {
            alert('Nenhum paciente selecionado para triagem.');
            return;
        }
        
        const triageOfficerId = 1;

        const triageData = {
            patient_id: currentPatientDataForTriage.patient_id,
            triage_officer_id: triageOfficerId,
            classification_id: getClassificationId(wristband_color), // Usa a nova função
            datetime: new Date().toISOString(),
            blood_pressure: blood_pressure,
            temperature: temperature,
            glucose: glucose,
            weight: weight,
            oxygen_saturation: oxygen_saturation,
            symptoms: symptoms
        };

        console.log('Dados da Triagem a serem enviados:', triageData);

        try {
            const response = await fetch('/api/triage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(triageData)
            });

            if (response.ok) {
                alert('Triagem registrada com sucesso!');
                await removePatientFromServiceQueue(currentPatientDataForTriage.service_id); 
                
                mostrarListaDeTriagem();
            } else {
                const errorData = await response.json();
                alert(`Erro ao registrar triagem: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro na requisição de triagem:', error);
            alert('Erro de conexão ao tentar registrar triagem.');
        }
    }

    // MUDANÇA AQUI: Agora mapeia strings de cor em inglês para IDs numéricos
    function getClassificationId(colorName) {
        switch (colorName.toLowerCase()) {
            case "red": return 1; // Vermelho
            case "orange": return 2; // Laranja
            case "yellow": return 3; // Amarelo
            case "green": return 4;   // Verde
            case "blue": return 5;    // Azul
            default: return null;
        }
    }

    function mostrarListaDeTriagem() {
        secaoFormulario.style.display = 'none';
        secaoLista.style.display = 'block';
        triageForm.reset();
        limparCoresPrioridade();
        displayNameElement.textContent = '';
        displayDobElement.textContent = '';
        currentPatientDataForTriage = null;
        fetchAndRenderQueuePatients();
    }


    // --- 4. Inicialização e Event Listeners ---

    if (prioritySelect) {
        prioritySelect.addEventListener('change', actualizarCorPrioridade);
    }

    if (backToQueueButton) {
        backToQueueButton.addEventListener('click', mostrarListaDeTriagem);
    }

    if (triageForm) {
        triageForm.addEventListener('submit', registrarTriagem);
    }

    fetchAndRenderQueuePatients();
});
