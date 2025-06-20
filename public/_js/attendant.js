// _js/attendant.js

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const registrationForm = document.getElementById('register-patient-form');
    const searchForm = document.getElementById('search-patient-form');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const tab = button.getAttribute('data-tab');


            if (tab === 'register') {
                registrationForm.style.display = 'block';
                searchForm.style.display = 'none';
            } else {
                registrationForm.style.display = 'none';
                searchForm.style.display = 'block';
            }
        });
    });

    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            console.log('Searching for:', event.target.value);
        });
    }

});