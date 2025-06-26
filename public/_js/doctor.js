document.addEventListener('DOMContentLoaded', () => {
    function displayUserData() {
        const userNameElement = document.getElementById('loggedInUserName');
        const userRoleElement = document.getElementById('loggedInUserRole');
        const userDataString = sessionStorage.getItem('loggedInUser');

        if (userDataString) {
            try {
                const userData = JSON.parse(userDataString);
                if (userNameElement) userNameElement.textContent = userData.username;
                if (userRoleElement) userRoleElement.textContent = userData.role;
            } catch (e) {
                console.error('Erro ao fazer parse dos dados do usuário do sessionStorage:', e);
                sessionStorage.removeItem('loggedInUser');
                if (userNameElement) userNameElement.textContent = 'Visitante';
                if (userRoleElement) userRoleElement.textContent = 'Desconhecido';
            }
        } else {
            console.warn('Nenhum dado de usuário encontrado no sessionStorage para o médico.');
            if (userNameElement) userNameElement.textContent = 'Visitante';
            if (userRoleElement) userRoleElement.textContent = 'Desconhecido';
        }
    }

    const doctorQueueBody = document.getElementById('doctor-queue-body');
    const patientQueueSection = document.getElementById('patient-queue');
    const medicalConsultationSection = document.getElementById('medical-consultation');
    const displayPatientName = document.getElementById('display-patient-name');
    const displayPatientDob = document.getElementById('display-patient-dob');
    const displayPatientGender = document.getElementById('display-patient-gender');
    const triageWeight = document.getElementById('triage-weight');
    const triageTemperature = document.getElementById('triage-temperature');
    const triageOxygenSaturation = document.getElementById('triage-oxygen-saturation');
    const triageBloodPressure = document.getElementById('triage-blood-pressure');
    const triageGlucose = document.getElementById('triage-glucose');
    const triageSymptoms = document.getElementById('triage-symptoms');
    const medicalOpinionTextarea = document.getElementById('medical-opinion');
    const startConsultationBtn = document.getElementById('start-consultation-btn');
    const callAgainBtn = document.getElementById('call-again-btn');
    const noShowBtn = document.getElementById('no-show-btn');
    const endConsultationBtn = document.getElementById('end-consultation-btn');
    const formMedicalOpinion = document.getElementById('medical-opinion');

    let currentPatientData = null;
    let isConsultationActive = false;
    const DOCTOR_ID = 1;

    function getPriorityBadgeClass(colorName) {
        switch (colorName.toLowerCase()) {
            case 'vermelho': return 'priority-red';
            case 'laranja': return 'priority-orange';
            case 'amarelo': return 'priority-yellow';
            case 'verde': return 'priority-green';
            case 'azul': return 'priority-blue';
            default: return 'priority-grey';
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

    function getStatusText(statusCode) {
        const statusNum = Number(statusCode);
        switch (statusNum) {
            case 0: return 'Aguardando Atendimento';
            case 1: return 'Em Atendimento';
            case 2: return 'Consultado';
            case 3: return 'Não Compareceu';
            default: return 'Desconhecido';
        }
    }

    function formatDate(isoDateString) {
        if (!isoDateString) return '';
        const date = new Date(isoDateString);
        return date.toLocaleDateString('pt-BR');
    }

    function getGenderText(genderCode) {
        switch (String(genderCode)) {
            case '1': return 'Masculino';
            case '2': return 'Feminino';
            case '3': return 'Outro';
            default: return 'Não Informado';
        }
    }

    async function fetchPriorityQueue() {
        try {
            const response = await fetch('/api/priority-queue');
            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            const patients = await response.json();

            // Filtra apenas os com status 0 (esperando) ou 1 (em atendimento)
            const filtered = patients.filter(p => p.queue_status === 0 || p.queue_status === 1);
            displayQueue(filtered);
        } catch (error) {
            console.error('Erro ao buscar a fila de prioridade:', error);
            doctorQueueBody.innerHTML = '<tr><td colspan="6">Erro ao carregar a fila de atendimento.</td></tr>';
        }
    }

    async function fetchTriageDetails(patientId, triageId) {
        try {
            const response = await fetch(`/api/triage-details/${patientId}/${triageId}`);
            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar detalhes da triagem:', error);
            alert('Não foi possível carregar os detalhes da triagem.');
            return null;
        }
    }

    async function updatePatientStatusInQueue(queueId, status) {
        try {
            const response = await fetch(`/api/priority-queue/${queueId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`${response.status} - ${errorData.message}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar status do paciente na fila:', error);
            alert('Não foi possível atualizar o status do paciente.');
            return null;
        }
    }

    async function registerAppointment(patientId, doctorId, observations) {
        try {
            const response = await fetch('/api/appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    doctor_id: doctorId,
                    datetime: new Date().toISOString(),
                    observations
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`${response.status} - ${errorData.message}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao registrar atendimento:', error);
            alert('Não foi possível registrar o atendimento.');
            return null;
        }
    }

    function displayQueue(patients) {
        doctorQueueBody.innerHTML = '';

        if (patients.length === 0) {
            doctorQueueBody.innerHTML = '<tr><td colspan="6">Nenhum paciente na fila de atendimento.</td></tr>';
            return;
        }

        patients.forEach((patient, index) => {
            const row = document.createElement('tr');
            const triageDate = new Date(patient.triage_datetime);
            const formattedDate = triageDate.toLocaleDateString('pt-BR');
            const formattedTime = triageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            row.dataset.patientId = patient.patient_id;
            row.dataset.queueId = patient.queue_id;
            row.dataset.triageId = patient.triage_id;
            row.dataset.queueStatus = patient.queue_status;

            let buttonText = '';
            let buttonClass = 'action-button';
            let isDisabled = false;

            if (isConsultationActive) {
                if (currentPatientData?.queue_id === patient.queue_id) {
                    buttonText = 'Visualizar Consulta';
                    buttonClass += ' active';
                } else {
                    buttonText = getStatusText(patient.queue_status);
                    buttonClass += ' inactive';
                    isDisabled = true;
                }
            } else {
                if (patient.queue_status === 0) {
                    buttonText = 'Chamar Paciente';
                    buttonClass += ' call-patient-btn';
                } else if (patient.queue_status === 1) {
                    buttonText = 'Visualizar Consulta';
                    buttonClass += ' active';
                } else {
                    buttonText = getStatusText(patient.queue_status);
                    buttonClass += ' disabled-btn';
                    isDisabled = true;
                }
            }

            row.innerHTML = `
                <td>${(index + 1).toString().padStart(3, '0')}</td>
                <td>${patient.patient_name}</td>
                <td><span class="priority-badge ${getPriorityBadgeClass(patient.color_name)}">${getPriorityText(patient.color_name)}</span></td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>${getStatusText(patient.queue_status)}</td>
                <td><button class="${buttonClass}" ${isDisabled ? 'disabled' : ''}>${buttonText}</button></td>
            `;

            doctorQueueBody.appendChild(row);
        });

        document.querySelectorAll('.action-button:not(.disabled-btn)').forEach(button => {
            button.addEventListener('click', handleActionButtonClick);
        });
    }

    function populateConsultationSection(patientData, triageData) {
        displayPatientName.textContent = patientData.patient_name || 'Nome Indisponível';
        displayPatientDob.textContent = `Data de Nascimento: ${formatDate(patientData.birth_date)}`;
        displayPatientGender.textContent = `Gênero: ${getGenderText(patientData.gender)}`;
        triageWeight.textContent = triageData.weight ? `${triageData.weight}kg` : 'N/A';
        triageTemperature.textContent = triageData.temperature ? `${triageData.temperature}°C` : 'N/A';
        triageOxygenSaturation.textContent = triageData.oxygen_saturation ? `${triageData.oxygen_saturation}%` : 'N/A';
        triageBloodPressure.textContent = triageData.blood_pressure || 'N/A';
        triageGlucose.textContent = triageData.glucose ? `${triageData.glucose} mg/dL` : 'N/A';
        triageSymptoms.textContent = triageData.symptoms || 'N/A';

        medicalOpinionTextarea.value = '';
        medicalOpinionTextarea.readOnly = true;
        startConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'none';
        noShowBtn.style.display = 'none';
        endConsultationBtn.style.display = 'none';
    }

    function clearConsultationSection() {
        displayPatientName.textContent = '';
        displayPatientDob.textContent = '';
        displayPatientGender.textContent = '';
        triageWeight.textContent = '';
        triageTemperature.textContent = '';
        triageOxygenSaturation.textContent = '';
        triageBloodPressure.textContent = '';
        triageGlucose.textContent = '';
        triageSymptoms.textContent = '';
        medicalOpinionTextarea.value = '';
        medicalOpinionTextarea.readOnly = true;
        startConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'none';
        noShowBtn.style.display = 'none';
        endConsultationBtn.style.display = 'none';
    }

    async function handleActionButtonClick(event) {
        const row = event.target.closest('tr');
        const { patientId, queueId, triageId, queueStatus } = row.dataset;

        currentPatientData = {
            patient_id: patientId,
            queue_id: queueId,
            triage_id: triageId,
            queue_status: parseInt(queueStatus)
        };

        const triageDetails = await fetchTriageDetails(patientId, triageId);
        if (triageDetails) {
            populateConsultationSection(triageDetails, triageDetails);
            patientQueueSection.style.display = 'none';
            medicalConsultationSection.style.display = 'block';
            isConsultationActive = true;
            fetchPriorityQueue();
        }
    }

    startConsultationBtn.addEventListener('click', async () => {
        if (currentPatientData && currentPatientData.queue_status === 0) {
            const updateStatusRes = await updatePatientStatusInQueue(currentPatientData.queue_id, 1);
            if (!updateStatusRes) return;
            currentPatientData.queue_status = 1;
        }

        medicalOpinionTextarea.readOnly = false;
        medicalOpinionTextarea.focus();
        startConsultationBtn.style.display = 'none';
        endConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'block';
        noShowBtn.style.display = 'block';
        formMedicalOpinion.placeholder = 'Escreva aqui sua avaliação médica e recomendações.';
        fetchPriorityQueue();
    });

    endConsultationBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!currentPatientData) return alert('Nenhum paciente selecionado.');

        const opinion = medicalOpinionTextarea.value.trim();
        if (!opinion) return alert('Por favor, insira o parecer médico.');

        const res = await registerAppointment(currentPatientData.patient_id, DOCTOR_ID, opinion);
        if (!res) return;

        await updatePatientStatusInQueue(currentPatientData.queue_id, 2);
        clearConsultationSection();
        medicalConsultationSection.style.display = 'none';
        patientQueueSection.style.display = 'block';
        currentPatientData = null;
        isConsultationActive = false;
        fetchPriorityQueue();
    });

    noShowBtn.addEventListener('click', async () => {
        if (!currentPatientData) return alert('Nenhum paciente selecionado.');
        const confirmNoShow = confirm('Confirmar "Não Compareceu"?');
        if (!confirmNoShow) return;

        await updatePatientStatusInQueue(currentPatientData.queue_id, 3);
        clearConsultationSection();
        medicalConsultationSection.style.display = 'none';
        patientQueueSection.style.display = 'block';
        currentPatientData = null;
        isConsultationActive = false;
        fetchPriorityQueue();
    });

    callAgainBtn.addEventListener('click', () => {
        if (!currentPatientData) return alert('Nenhum paciente selecionado.');
        alert('Chamando paciente novamente!');
    });

    function initializePage() {
        displayUserData();
        fetchPriorityQueue();
        setInterval(fetchPriorityQueue, 5000);
    }

    initializePage();
});
