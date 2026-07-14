const loginForm = document.getElementById('login-form');

loginForm?.addEventListener('submit', function(event) {
    event.preventDefault();

    const CNPJ = document.getElementById('CNPJ').value;
    const senha = document.getElementById('senha').value;
    const errorMessage = document.getElementById('error-message');

    // Cria o corpo da requisição
    const requestBody = { CNPJ, senha };

    // Configura a requisição fetch
    const requestConfig = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    };

    fetch('/login_empresa', requestConfig)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || 'Erro na requisição');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('✅ Login realizado:', data.message);
                alert('Login realizado com sucesso!');

                localStorage.setItem('RazaoSocial', data.RazaoSocial);

                console.log('🔄 Redirecionando para VisaoGeral.html...');
                window.location.replace('VisaoGeral.html');
            } else {
                errorMessage.textContent = data.message || 'Erro no login';
            }
        })
        .catch(error => {
            console.error('❌ Erro na requisição:', error);
            errorMessage.textContent = error.message || 'Erro desconhecido.';
        });
});
