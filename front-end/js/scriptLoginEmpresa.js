document.getElementById('login-form').addEventListener('submit', function(event) {
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

    fetch('http://127.0.0.1:5500/login_empresa', requestConfig)
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

                // Armazena os dados no localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('RazaoSocial', data.RazaoSocial);

                console.log('🔄 Redirecionando para login_cliente.html...');
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
