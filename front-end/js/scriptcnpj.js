document.addEventListener("DOMContentLoaded", function() {
    function formatCNPJ(value) {
        value = value.replace(/\D/g, ""); // Remove caracteres não numéricos
        value = value.slice(0, 14); // Limita a 14 números
        value = value.replace(/^(\d{2})(\d)/, "$1.$2");
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
        value = value.replace(/(\d{4})(\d)/, "$1-$2");
        return value;
    }

    document.getElementById("CNPJ").addEventListener("input", function(e) {
        this.value = formatCNPJ(this.value);
    });
});

