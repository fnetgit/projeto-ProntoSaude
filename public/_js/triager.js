// _js/triager.js

document.addEventListener('DOMContentLoaded', () => {
    const triagerListSection = document.getElementById('triager-queue-list');
    const triagerFormSection = document.getElementById('triager-data-form');
    const triagerForm = document.querySelector('#triager-data-form .triage-form');
    const backToListButton = document.querySelector('#triager-data-form .back-button');
    const prioritySelect = document.getElementById('priority_classification');
    const triagerQueueTbody = document.getElementById('triager-queue-body');
    const displayNameElement = document.getElementById('display-patient-name');
    const displayDobElement = document.getElementById('display-patient-dob');

    let currentPatientForTriage = null;

    function formatCpf(cpf) { }
    function formatPhone(phone) { }

    function clearPriorityColors() {
        const wrapper = prioritySelect.closest('.select-wrapper');
        const priorityClasses = ['priority-red', 'priority-orange', 'priority-yellow', 'priority-green', 'priority-blue'];
        prioritySelect.classList.remove(...priorityClasses);
        if (wrapper) wrapper.classList.remove(...priorityClasses, 'has-color');
    }

    function updatePriorityColor() {
        clearPriorityColors();
        const wrapper = prioritySelect.closest('.select-wrapper');
        const value = prioritySelect.value;
        if (value) {
            const newClass = `priority-${value}`;
            prioritySelect.classList.add(newClass);
            if (wrapper) wrapper.classList.add(newClass, 'has-color');
        }
    }

    function showTriagerForm(patient) {
        currentPatientForTriage = patient;
        displayNameElement.textContent = patient.patient_name;
        displayDobElement.textContent = `Data de Nascimento: ${new Date(patient.birth_date).toLocaleDateString('pt-BR')}`;
        triagerListSection.style.display = 'none';
        triagerFormSection.style.display = 'block';
    }

    function showTriagerList() {
        triagerFormSection.style.display = 'none';
        triagerListSection.style.display = 'block';
        triagerForm.reset();
        clearPriorityColors();
        currentPatientForTriage = null;
        fetchAndRenderQueueForTriager();
    }

    async function handleRemoveButtonClick(serviceId, patientName) {
        if (confirm(`Tem certeza que deseja remover ${patientName} da fila de triagem?`)) {
            try {
                const response = await fetch(`/api/queue/${serviceId}`, { method: 'DELETE' });
                if (response.ok) {
                    alert(`${patientName} removido da fila com sucesso!`);
                    fetchAndRenderQueueForTriager();
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao remover ${patientName} da fila: ${errorData.message || response.statusText}`);
                }
            } catch (error) {
                console.error('Connection error while removing patient from queue:', error);
                alert('Erro de conexão ao tentar remover paciente da fila.');
            }
        }
    }

    async function fetchAndRenderQueueForTriager() {
        if (!triagerQueueTbody) return;
        triagerQueueTbody.innerHTML = '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';

        try {
            const response = await fetch('/api/queue-patients');
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const patientsInQueue = await response.json();
            triagerQueueTbody.innerHTML = '';

            if (patientsInQueue.length === 0) {
                triagerQueueTbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum paciente na fila de triagem hoje.</td></tr>';
                return;
            }

            patientsInQueue.forEach((patient, index) => {
                const row = triagerQueueTbody.insertRow();
                row.insertCell().textContent = patient.patient_name;
                row.insertCell().textContent = formatCpf(patient.cpf);
                row.insertCell().textContent = patient.sus_card;
                row.insertCell().textContent = formatPhone(patient.phone || '');
                row.insertCell().textContent = new Date(patient.birth_date).toLocaleDateString('pt-BR');


                const actionCell = row.insertCell();
                const isFirst = index === 0;
                actionCell.innerHTML = `
                    <button class="initiate-button ${isFirst ? 'active' : 'inactive'}" ${!isFirst ? 'disabled' : ''}>
                        ${isFirst ? 'Iniciar' : 'Aguardando'}
                    </button>
                    <button class="remove-button" data-service-id="${patient.service_id}" style="margin-left: 5px; background-color: var(--danger-color); color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">Remover</button>
                `;

                if (isFirst) {
                    actionCell.querySelector('.initiate-button').addEventListener('click', () => showTriagerForm(patient));
                }
                actionCell.querySelector('.remove-button').addEventListener('click', () => handleRemoveButtonClick(patient.service_id, patient.patient_name));
            });
        } catch (error) {
            console.error('Error fetching triager queue:', error);
            triagerQueueTbody.innerHTML = '<tr><td colspan="6" class="text-center">Erro ao carregar fila de triagem.</td></tr>';
        }
    }

    function getClassificationId(colorName) {
        switch (colorName.toLowerCase()) {
            case "red": return 1;
            case "orange": return 2;
            case "yellow": return 3;
            case "green": return 4;
            case "blue": return 5;
            default: return null;
        }
    }


    async function registerTriage(event) {
        event.preventDefault();
        const formData = new FormData(triagerForm);
        const triageDataPayload = {
            patient_id: currentPatientForTriage.patient_id,
            triage_officer_id: 1,
            datetime: new Date().toISOString(),
            blood_pressure: formData.get('blood_pressure'),
            temperature: parseFloat(formData.get('temperature')),
            glucose: parseFloat(formData.get('glucose')),
            weight: parseFloat(formData.get('weight')),
            oxygen_saturation: parseFloat(formData.get('oxygen_saturation')),
            symptoms: formData.get('symptoms'),
            classification_id: getClassificationId(formData.get('priority_classification'))
        };

        console.log('Triage data to be sent:', triageDataPayload);

        try {
            const response = await fetch('/api/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(triageDataPayload)
            });

            if (response.ok) {
                alert('Triagem registrada com sucesso!');
                await fetch(`/api/queue/${currentPatientForTriage.service_id}`, { method: 'DELETE' });
                showTriagerList();
            } else {
                const errorData = await response.json();
                alert(`Erro ao registrar triagem: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Triage request error:', error);
            alert('Erro de conexão ao tentar registrar triagem.');
        }
    }

    if (prioritySelect) prioritySelect.addEventListener('change', updatePriorityColor);
    if (backToListButton) backToListButton.addEventListener('click', showTriagerList);
    if (triagerForm) triagerForm.addEventListener('submit', registerTriage);

    fetchAndRenderQueueForTriager();
});