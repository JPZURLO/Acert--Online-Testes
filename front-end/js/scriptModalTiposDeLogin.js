document.getElementById('link-login').addEventListener('click', function(e) {
    e.preventDefault(); // Previne o comportamento padrão do link
    const dropdown = this.closest('.dropdown'); // Pega o elemento pai .dropdown
    dropdown.classList.toggle('active'); // Alterna a classe active
});
