// _js/triador.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Seleção dos Elementos ---
    const secaoLista = document.getElementById('triagem-pacientes');
    const secaoFormulario = document.getElementById('dados-da-triagem');
    const triageForm = document.querySelector('#dados-da-triagem .triage-form');
    const botaoVoltar = document.querySelector('.back-button');
    const prioridadeSelect = document.getElementById('prioridade');
    const corpoTabela = document.getElementById('triage-body');

    // Elementos para exibir os dados do paciente
    const displayNameElement = document.getElementById('display-patient-name');
    const displayDobElement = document.getElementById('display-patient-dob');

    let linhaEmAtendimento = null;

    // --- 2. Funções ---

    function mostrarFormulario(event) {
        linhaEmAtendimento = event.target.closest('tr');

        // Captura e exibe os dados do paciente
        if (linhaEmAtendimento) {
            const celulas = linhaEmAtendimento.cells;
            const nomePaciente = celulas[0].textContent;
            const nascimentoPaciente = celulas[4].textContent;

            displayNameElement.textContent = nomePaciente;
            displayDobElement.textContent = `Data de Nascimento: ${nascimentoPaciente}`;
        }

        secaoLista.style.display = 'none';
        secaoFormulario.style.display = 'block';
    }

    function mostrarLista() {
        secaoFormulario.style.display = 'none';
        secaoLista.style.display = 'block';
        triageForm.reset();
        limparCoresPrioridade();

        // Limpa os dados do paciente ao voltar para a lista
        displayNameElement.textContent = '';
        displayDobElement.textContent = '';
    }

    function limparCoresPrioridade() {
        const wrapper = prioridadeSelect.closest('.select-wrapper');
        const classesDePrioridade = ['priority-vermelho', 'priority-laranja', 'priority-amarelo', 'priority-verde', 'priority-azul'];
        prioridadeSelect.classList.remove(...classesDePrioridade);
        if (wrapper) {
            wrapper.classList.remove(...classesDePrioridade, 'has-color');
        }
    }

    function atualizarCorPrioridade() {
        limparCoresPrioridade();
        const wrapper = prioridadeSelect.closest('.select-wrapper');
        const valor = prioridadeSelect.value;
        if (valor) {
            const novaClasse = `priority-${valor}`;
            prioridadeSelect.classList.add(novaClasse);
            if (wrapper) {
                wrapper.classList.add(novaClasse, 'has-color');
            }
        }
    }

    function ativarProximoDaFila() {
        const proximaLinha = corpoTabela.querySelector('tr');
        if (!proximaLinha) return;

        const proximoBotao = proximaLinha.querySelector('.initiate-button.inactive');
        if (proximoBotao) {
            proximoBotao.textContent = 'Iniciar';
            proximoBotao.classList.remove('inactive');
            proximoBotao.classList.add('active');
            proximoBotao.disabled = false;
            proximoBotao.addEventListener('click', mostrarFormulario);
        }
    }

    function registrarTriagem(event) {
        event.preventDefault();

        const formData = {
            peso: document.getElementById('peso').value.trim(),
            altura: document.getElementById('altura').value.trim(),
            temperatura: document.getElementById('temperatura').value.trim(),
            saturacaoOxigenio: document.getElementById('saturacaoOxigenio').value.trim(),
            pressaoArterial: document.getElementById('pressaoArterial').value.trim(),
            glicose: document.getElementById('glicose').value.trim(),
            sintomasDescricao: document.getElementById('sintomasDescricao').value.trim(),
            prioridade: prioridadeSelect.value
        };

        console.log('Dados da Triagem Registrados:', formData);
        alert('Triagem registrada com sucesso!');

        if (linhaEmAtendimento) {
            linhaEmAtendimento.remove();
            linhaEmAtendimento = null;
        }

        ativarProximoDaFila();
        mostrarLista();
    }

    // --- 3. Adicionar Eventos Iniciais ---
    const botaoInicial = document.querySelector('.initiate-button.active');
    if (botaoInicial) {
        botaoInicial.addEventListener('click', mostrarFormulario);
    }

    botaoVoltar.addEventListener('click', mostrarLista);
    prioridadeSelect.addEventListener('change', atualizarCorPrioridade);
    triageForm.addEventListener('submit', registrarTriagem);
});