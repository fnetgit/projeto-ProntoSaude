// _js/medico.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Seleção dos Elementos ---
    const secaoFila = document.getElementById('fila-de-pacientes');
    const secaoConsulta = document.getElementById('atendimento-medico');
    const formConsulta = document.querySelector('.medical-report-form');
    const corpoTabela = document.getElementById('fila-body');
    const displayNameElement = document.getElementById('display-patient-name');
    const displayDobElement = document.getElementById('display-patient-dob');

    // --- ELEMENTOS DA CONSULTA ---
    const parecerMedicoTextarea = document.getElementById('parecerMedico');
    const btnIniciarConsulta = document.getElementById('iniciar-consulta-btn');
    const btnEncerrarConsulta = document.getElementById('encerrar-consulta-btn');
    const btnChamarNovamente = document.getElementById('chamar-novamente-btn');
    const btnNaoCompareceu = document.getElementById('nao-compareceu-btn');

    let linhaEmAtendimento = null; // Guarda a linha (TR) do paciente em atendimento

    // --- 2. Funções ---

    /**
     * Ativa o botão de ação para o próximo paciente na fila.
     */
    function ativarProximoDaFila() {
        const proximaLinha = corpoTabela.querySelector('tr'); // Pega a nova primeira linha
        if (!proximaLinha) return; // Sai da função se não houver mais pacientes

        const proximoBotao = proximaLinha.querySelector('.action-button.inactive');
        if (proximoBotao) {
            proximoBotao.textContent = 'Chamar Paciente';
            proximoBotao.classList.remove('inactive');
            proximoBotao.classList.add('active');
            proximoBotao.disabled = false;
            // Adiciona o evento de clique APENAS ao botão que foi ativado
            proximoBotao.addEventListener('click', mostrarConsulta);
        }
    }

    /**
     * Exibe a tela de consulta, armazena os dados do paciente e esconde a fila.
     * @param {Event} event - O evento de clique que acionou a função.
     */
    function mostrarConsulta(event) {
        linhaEmAtendimento = event.target.closest('tr');

        const nomePaciente = linhaEmAtendimento.cells[1].textContent;
        const nascimentoPaciente = linhaEmAtendimento.cells[4].textContent;

        displayNameElement.textContent = nomePaciente;
        displayDobElement.textContent = `Data de Nascimento: ${nascimentoPaciente}`;

        secaoFila.style.display = 'none';
        secaoConsulta.style.display = 'block';
    }

    /**
     * Reseta a tela de consulta para o estado inicial.
     */
    function resetarTelaConsulta() {
        formConsulta.reset(); // Limpa o textarea
        parecerMedicoTextarea.readOnly = true;
        parecerMedicoTextarea.placeholder = "Clique em 'Iniciar Consulta' para liberar a edição...";

        // Define a visibilidade inicial dos botões
        btnIniciarConsulta.style.display = 'inline-block';
        btnChamarNovamente.style.display = 'inline-block';
        btnNaoCompareceu.style.display = 'inline-block';
        btnEncerrarConsulta.style.display = 'none';
    }

    /**
     * Exibe a fila de pacientes, esconde e reseta a tela de consulta.
     */
    function mostrarFila() {
        secaoConsulta.style.display = 'none';
        secaoFila.style.display = 'block';
        displayNameElement.textContent = '';
        displayDobElement.textContent = '';
        resetarTelaConsulta(); // Garante que a tela de consulta seja resetada ao voltar
    }

    /**
     * Libera o campo de parecer médico e ajusta os botões.
     */
    function iniciarConsulta() {
        parecerMedicoTextarea.readOnly = false;
        parecerMedicoTextarea.placeholder = "Descreva o diagnóstico, tratamento e recomendações...";
        parecerMedicoTextarea.focus(); // Foca no campo de texto

        // Esconde os botões de ação inicial e mostra o de encerrar
        btnIniciarConsulta.style.display = 'none';
        btnChamarNovamente.style.display = 'none';
        btnNaoCompareceu.style.display = 'none';
        btnEncerrarConsulta.style.display = 'inline-block';
    }

    /**
     * Simula uma nova chamada ao paciente.
     */
    function chamarNovamente() {
        const nomePaciente = displayNameElement.textContent;
        alert(`Chamando paciente ${nomePaciente} novamente!`);
    }

    /**
     * Registra o não comparecimento do paciente e volta para a fila.
     */
    function registrarNaoComparecimento() {
        const nomePaciente = displayNameElement.textContent;
        const confirmou = confirm(`Deseja realmente registrar a ausência do paciente ${nomePaciente}? Esta ação não pode ser desfeita.`);

        if (confirmou) {
            console.log(`Paciente ${nomePaciente} registrado como NÃO COMPARECEU.`);
            alert(`Ausência de ${nomePaciente} registrada.`);

            if (linhaEmAtendimento) {
                linhaEmAtendimento.remove();
                linhaEmAtendimento = null;
            }

            ativarProximoDaFila();
            mostrarFila();
        }
    }

    /**
     * Processa o encerramento da consulta.
     * @param {Event} event - O evento de submit do formulário.
     */
    function encerrarConsulta(event) {
        event.preventDefault();

        const parecerMedico = parecerMedicoTextarea.value.trim();
        if (!parecerMedico) {
            alert('Por favor, preencha o parecer do médico antes de encerrar a consulta.');
            return;
        }

        const dadosConsulta = {
            paciente: displayNameElement.textContent,
            parecer: parecerMedico
        };
        console.log('Consulta Encerrada. Dados:', dadosConsulta);
        alert('Consulta encerrada e registrada com sucesso!');

        if (linhaEmAtendimento) {
            linhaEmAtendimento.remove();
            linhaEmAtendimento = null;
        }

        ativarProximoDaFila();
        mostrarFila(); // Esta função agora também reseta os botões
    }

    // --- 3. Adicionar Eventos ---
    const botaoInicial = document.querySelector('#fila-de-pacientes .action-button.active');
    if (botaoInicial) {
        botaoInicial.addEventListener('click', mostrarConsulta);
    }

    // Eventos dos botões de consulta
    btnIniciarConsulta.addEventListener('click', iniciarConsulta);
    btnChamarNovamente.addEventListener('click', chamarNovamente);
    btnNaoCompareceu.addEventListener('click', registrarNaoComparecimento);
    formConsulta.addEventListener('submit', encerrarConsulta);
});