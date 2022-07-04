function mostrar(){
    var nome = document.getElementById("nome").value
    var email = document.getElementById("email").value
    var numero = document.getElementById("numero").value
    var curso = document.getElementById("curso").value

    alert('Dados inseridos no formulário \n\n' +'Nome: '+ nome + '\n'+ 'E-mail: '+ email +'\n'+ 'Número: '+ numero +'\n' + 'Curso: '+ curso)
}

function start(){
    swal("Nesta secção vamos aprender o básico de js", 
    "Vamos ver variáveis, array, matriz, entradas via teclado, saídas (console, document, alert), funções, variáveis com declarações var e let ");
}


function teste(){

    x = window.prompt('Digite o primeiro número');
    var y = window.prompt('Digite o segundo número');
    var total = parseFloat(x) + parseFloat(y);
    var x;
    document.getElementById("resultado").innerHTML = "Resultado: "+ total;

    document.getElementById("text").innerHTML = "O var permite utilizar a variável sem ela está declarada!";
}


function teste1(){
    document.getElementById("text1").innerHTML = "O let não permite utilizar a variável sem ela está declarada!";
    x = window.prompt('Digite o primeiro número');
    let y = window.prompt('Digite o segundo número');
    let total = parseFloat(x) + parseFloat(y);
    let x;
    document.getElementById("resultado2").innerHTML = "Resultado: "+ total;

}


function teste2(){

    document.getElementById("text2").innerHTML = "O const não permite isso!";
    const x =3;
    x =1;
    document.getElementById("resultado3").innerHTML = "Resultado: "+ x;

}

function teste3(){

    var x = [1,8,5,6,"Carla","Victor"]
    var y = document.getElementById("resultado4").innerHTML = "Resultado: "+ x;
  

}

function teste4(){

        var matriz = [ ["Carlos",9,7.5], ["Antônio",5,6.9], ["Valeria",8,9.2] ];

        document.write("Nome, Aval, Nota"+"<br>");
        for (let lin = 0; lin < 3; lin++) {
        for (let col = 0; col < 3; col++)
            document.write(matriz[lin][col] + ", ");
            document.write("<br />");
        }

        console.log("Matriz mostrada !")
}
  