const formulario = document.getElementById("pedidoForm");

formulario.addEventListener("submit", function(event) {

    event.preventDefault();

    let nome = document.getElementById("nome").value;

    document.getElementById("mensagem").innerHTML =

    "Pedido realizado com sucesso, " + nome + "!";

});
 