// _js/patient-registration.js

// const registrationForm = document.getElementById('register-patient-form');
// const searchForm = document.getElementById('search-patient-form');
// const editform = document.getElementById('edit-patient-form')

document.addEventListener('DOMContentLoaded', () => {

    const patientRegistrationForm = document.querySelector('#register-patient-form form');
    const paitientUpdateForm = document.querySelector('#edit-patient-form form')
    const patientTableTbody = document.getElementById('patient-list-body');
    const searchInput = document.querySelector('.search-bar input');
    const searchTabButton = document.querySelector('.tab-button[data-tab="search"]');

    let allPatients = [];

    function formatCpf(cpf) {
        if (!cpf) return '';
        const cleaned = String(cpf).replace(/\D/g, '');
        if (cleaned.length !== 11) return cpf;
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    function formatSusCard(susCard) {
        if (!susCard) return '';
        const cleaned = String(susCard).replace(/\D/g, '');
        if (cleaned.length !== 15) return susCard;
        return cleaned.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
    }

    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = String(phone).replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    }

    // --- LÓGICA DE AÇÕES E COMUNICAÇÃO COM API ---

    // Envia o paciente para a fila de triagem.
    async function handleConsultButtonClick(patientId) {
        console.log('Botão "Consulta" clicado para o paciente ID:', patientId);
        const attendantId = 1;

        try {
            const response = await fetch('/api/service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    attendant_id: attendantId,
                    datetime: new Date().toISOString()
                })
            });

            if (response.ok) {
                alert('Paciente enviado para a fila de triagem com sucesso!');
            } else {
                const errorData = await response.json();
                alert(`Erro ao enviar paciente para a fila: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro na requisição para a fila de atendimento:', error);
            alert('Erro de conexão ao enviar paciente para a fila.');
        }
    }

    function renderTable(patientsToRender) {
        patientTableTbody.innerHTML = '';

        patientsToRender.forEach(patient => {
            const row = patientTableTbody.insertRow();
            row.dataset.patientId = patient.patient_id;

            row.insertCell().textContent = patient.patient_name;
            row.insertCell().textContent = formatCpf(patient.cpf);
            row.insertCell().textContent = formatSusCard(patient.sus_card);
            row.insertCell().textContent = formatPhone(patient.phone);
            row.insertCell().textContent = new Date(patient.birth_date).toLocaleDateString('pt-BR');

            const actionCell = row.insertCell();
            actionCell.className = 'action-buttons';
            actionCell.innerHTML = `
                <button class="edit-btn"><img src="https://cdn-icons-png.flaticon.com/512/1159/1159633.png" width="20px" height="20px" alt="Editar" /></button>
                <button class="consult-btn">Consulta</button>
            `;

            actionCell.querySelector('.consult-btn').addEventListener('click', () => handleConsultButtonClick(patient.patient_id));

            actionCell.querySelector('.edit-btn').addEventListener('click', () => {
                const form = document.querySelector('#register-patient-form form');
                document.getElementById('register-patient-form').style.display = 'block';
                document.getElementById('search-patient-form').style.display = 'none';

                // Preenche os campos do formulário
                for (const [key, value] of Object.entries(patient)) {
                    const input = form.querySelector(`#${key}`);
                    if (input) input.value = value;
                }

                // Marca como modo de edição
                form.dataset.editingId = patient.patient_id;

                // Altera o texto do botão
                const submitButton = form.querySelector('.submit-button');
                if (submitButton) submitButton.textContent = 'ATUALIZAR PACIENTE';

            });
        });
    }

    async function fetchAndRenderPatients() {
        if (!patientTableTbody) return;
        if (allPatients.length === 0) {
            patientTableTbody.innerHTML = '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';
        }

        try {
            const response = await fetch('/api/pacientes');
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            allPatients = await response.json();
            renderTable(allPatients);

        } catch (error) {
            console.error('Erro ao buscar pacientes:', error);
            patientTableTbody.innerHTML = '<tr><td colspan="6" class="text-center">Erro ao carregar pacientes.</td></tr>';
        }
    }


    // 1. Listener do campo de busca (pesquisa por Nome ou CPF).
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const numericSearchTerm = searchTerm.replace(/\D/g, '');

            if (searchTerm.trim() === '') {
                renderTable(allPatients);
                return;
            }

            const filteredPatients = allPatients.filter(patient => {
                const nameMatch = patient.patient_name && patient.patient_name.toLowerCase().includes(searchTerm);
                const cpfMatch = numericSearchTerm.length > 0 && patient.cpf && String(patient.cpf).startsWith(numericSearchTerm);
                return nameMatch || cpfMatch;
            });

            renderTable(filteredPatients);
        });
    }

    // 2. Listener do formulário de cadastro de paciente.
    if (patientRegistrationForm) {
        patientRegistrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const editingId = patientRegistrationForm.dataset.editingId;
            if (editingId) {
                updatePatient(editingId);
                return;
            }

            const formData = new FormData(patientRegistrationForm);
            const patientData = Object.fromEntries(formData.entries());

            // Limpa os dados antes de enviar para a API
            if (patientData.cpf) patientData.cpf = String(patientData.cpf).replace(/\D/g, '');
            if (patientData.sus_card) patientData.sus_card = String(patientData.sus_card).replace(/\D/g, '');
            if (patientData.phone) patientData.phone = String(patientData.phone).replace(/\D/g, '');
            patientData.gender = parseInt(String(patientData.gender), 10);

            try {
                const response = await fetch('/api/pacientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patientData)
                });

                if (response.ok) {
                    alert('Paciente cadastrado com sucesso!');
                    patientRegistrationForm.reset();

                    if (searchTabButton) searchTabButton.click();
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao cadastrar paciente: ${errorData.message || response.statusText}`);
                }
            } catch (error) {
                console.error('Erro na requisição de cadastro:', error);
                alert('Erro de conexão ao tentar cadastrar paciente.');
            }
        });
        const cadastroTabButton = document.querySelector('.tab-button[data-tab="register"]');
        const registerFormSection = document.getElementById('register-patient-form');
        const submitButton = document.getElementById('submit-button');

        if (cadastroTabButton) {
            cadastroTabButton.addEventListener('click', () => {
                registerFormSection.style.display = 'block';

                patientRegistrationForm.reset();

                submitButton.textContent = 'CADASTRAR PACIENTE';

                patientRegistrationForm.removeAttribute('data-editing-id');
            });
        }
    }

    // 3. Listener da aba de busca (para recarregar a lista).
    if (searchTabButton) {
        // Carrega a lista quando a aba é clicada.
        searchTabButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            fetchAndRenderPatients();
        });
    }

    async function updatePatient(patientId) {
        const form = document.querySelector('#register-patient-form form');
        const formData = new FormData(form);
        const patientData = Object.fromEntries(formData.entries());

        if (patientData.cpf) patientData.cpf = String(patientData.cpf).replace(/\D/g, '');
        if (patientData.sus_card) patientData.sus_card = String(patientData.sus_card).replace(/\D/g, '');
        if (patientData.phone) patientData.phone = String(patientData.phone).replace(/\D/g, '');
        patientData.gender = parseInt(String(patientData.gender), 10);

        try {
            const response = await fetch(`/api/pacientes/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });

            if (response.ok) {
                alert('Paciente atualizado com sucesso!');
                form.reset();
                form.removeAttribute('data-editing-id');
                const submitButton = form.querySelector('.submit-button');
                if (submitButton) submitButton.textContent = 'CADASTRAR PACIENTE';

                if (searchTabButton) searchTabButton.click();
            } else {
                const errorData = await response.json();
                alert(`Erro ao atualizar paciente: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro ao atualizar paciente:', error);
            alert('Erro de conexão com o servidor.');
        }
    }

    fetchAndRenderPatients();
});