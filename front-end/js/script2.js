const loginForm = document.getElementById('login-form');

loginForm?.addEventListener('submit', function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const errorMessage = document.getElementById('error-message');

    // Cria o corpo da requisição de forma mais clara
    const requestBody = { email, senha };

    // Configura a requisição fetch
    const requestConfig = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    };

    fetch('/login', requestConfig)
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

                localStorage.setItem('NomeCompleto', data.NomeCompleto);

                console.log('🔄 Redirecionando para login_cliente.html...');
                // Substitui a página para evitar voltar à tela de login
                window.location.replace('login_cliente.html');
            } else {
                errorMessage.textContent = data.message || 'Erro no login';
            }
        })
        .catch(error => {
            console.error('❌ Erro na requisição:', error);
            errorMessage.textContent = error.message || 'Erro desconhecido.';
        });
});
