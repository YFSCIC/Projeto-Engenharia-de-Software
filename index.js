const banco = require("./banco");
const express = require("express");
const app = express();
const cryptoJS = require("crypto");
const port = 5000;
// Configura ejs
app.set("engine ejs", "ejs");
// Configura o servidor para receber requisições com JSON
app.use(express.json());
// Configura o servidor para receber requisições com parametros
app.use(express.urlencoded({ extended: true }));
// Configura pagina das views
app.use(express.static(__dirname + "/views"));
// Configura arquivos publicos
app.use(express.static("public"));
//Expressões Regulares
const isIf = /^(\s*if\s*\()/g; // if(
const isElse = /^(\s*else\s*\{?)/g; // while(
const isChave = /\s*\}\s*/g; // Fecha chaves
const isAtribuicao = /^((\s*(let|var|const)\s)?\s*[A-Za-z_]\w*\s*=)/; // (let|var|const) nomeVariavel =
const pegarFimIf = /(\s*\)\s*\{?)$/; // Fim do if
const pegarInicioIf = /^(\s*if\s*\(\s*)/; // Início do if
const pegarOperandos = /(['"])\w*(['"])|\d+(\.\d+)?/g; // Operandos de uma expressão
const pegarOperadores = /\+|\-|\*\//g; // +|-|*|/
const pegarString = /(['"]).*(['"])/g; // Strings
const pegarNomeVariavel = /[A-Za-z_]\w*/g; // Nome da variavel
const pegarLadoEsquerdo = /^((\s*(let|var|const)\s)?\s*(?<nomeVariavel>[A-Za-z_]\w*)\s*=\s*)/; // (let|var|const) nomeVariavel =
app.post("/programa", async (request, response) => {
    // Corpo da requisição
    const programa = request.body;
    // Se houver corpo da requisição
    if (programa?.programa_o || programa?.programa_p) {
        // Da nome aleatorio ao programa caso nao exista um no corpo da requisicao
        programa.nome = programa.nome ?? "nome" + cryptoJS.randomInt(9999);
        // PROG O
        // Salva o programa no banco de dados
        const idPrograma = await banco.salvarOuAtualizarPrograma(programa.nome);
        // Salva as linhas do programa O no banco de dados
        const valorTesteProgramaO = await salvarLinhas(programa.programa_o, "o", idPrograma);
        // Calcula valor do programa O e salva no banco de dados
        await banco.atualizarValorPrograma(programa.nome, valorTesteProgramaO, "o");
        // PROG O
        // Salva as linhas do programa P no banco de dados
        const valorTesteProgramaP = await salvarLinhas(programa.programa_p, "p", idPrograma);
        // Calcula valor do programa P e salva no banco de dados
        await banco.atualizarValorPrograma(programa.nome, valorTesteProgramaP, "p");
        console.log(`Programa ${programa.nome} gravado com sucesso!`);
        response.status(201).send("Programa Gravado");
    }
    else {
        // Nao existe corpo da requisição
        response.status(400).send("Dado Null");
    }
});
/**
 * Extrai, trata e salva as linhas do programa
 * @param programa Programa a ser salvo
 * @param tipo Tipo do programa (`o` ou `p`)
 * @param idPrograma Id do programa
 * @returns Retorna o valor do programa
 */
async function salvarLinhas(programa, tipo, idPrograma) {
    let ifTrue = false;
    let dentroIf = false;
    let ifAtivado = false;
    let procurandoElse = false;
    let valorTestePrograma = 0;
    // Separa as linhas do programa
    const linhas = programa.split(process.platform !== "win32" ? "\r\n" : "\n");
    for (let numLinha = 0; numLinha < linhas.length; numLinha++) {
        // Linha atual
        const linha = linhas[numLinha];
        // Salva a linha no banco de dados e recebe o id da linha salva
        const idLinha = await banco.salvarLinha(numLinha + 1, tipo, linha + "\n", idPrograma);
        if ((ifAtivado && ifTrue && dentroIf) ||
            (ifAtivado && !ifTrue && !dentroIf) ||
            !ifAtivado) {
            let valorTesteLinha = 0;
            // Testa se a linha é uma atribuição
            if (isAtribuicao.test(linha)) {
                // Se nao achou else
                if (procurandoElse) {
                    ifAtivado = false;
                    procurandoElse = false;
                }
                valorTesteLinha = await tratarAtribuição(linha, idLinha);
            }
            else if (isIf.test(linha)) {
                const resultado = await tratarIf(linha, idLinha);
                valorTesteLinha = resultado.valorTesteLinha;
                ifTrue = resultado.valorCondicao;
                dentroIf = true;
                ifAtivado = true;
            }
            else if (isElse.test(linha)) {
                procurandoElse = false;
            }
            else if (isChave.test(linha)) {
                if (dentroIf) {
                    dentroIf = false;
                    procurandoElse = true;
                }
                else {
                    ifAtivado = false;
                }
            }
            valorTestePrograma += valorTesteLinha;
            await banco.updateValorLinha(idLinha, valorTesteLinha);
        }
        else if (isElse.test(linha)) {
            procurandoElse = false;
        }
        else if (isChave.test(linha)) {
            if (dentroIf) {
                dentroIf = false;
                procurandoElse = true;
            }
            else {
                ifAtivado = false;
            }
        }
    }
    return Promise.resolve(valorTestePrograma);
}
/**
 * Trata codigo de atribuição
 * @param linha Linha a ser tratada
 * @param idLinha Id da linha
 * @returns Valor da linha
 */
async function tratarAtribuição(linha, idLinha) {
    let ladoEsquerdo = pegarLadoEsquerdo.exec(linha);
    // Remove lado esquerdo da atribuição, resultando apenas no lado direito
    let ladoDireito = linha.replace(ladoEsquerdo[0], "");
    let nomeVariavel = ladoEsquerdo?.groups?.nomeVariavel;
    // Busca strings no lado direito da atribuicao - ex : "sou uma string"
    let strings = ladoDireito.match(pegarString);
    let ladoDireitoSemStrings = ladoDireito;
    for (let st of strings ?? []) {
        // Remove aspas simples ou duplas da string
        ladoDireitoSemStrings = ladoDireitoSemStrings.replace(st, "");
    }
    // Busca variaveis desse programa que ja existem no banco
    let variaveisBanco = await banco.buscarVariaveis(idLinha);
    let variaveisSubstituiveis = ladoDireitoSemStrings.match(pegarNomeVariavel);
    // Substitui as variaveis pelos valores do banco
    for (let varSubstituivel of variaveisSubstituiveis ?? []) {
        ladoDireito = ladoDireito.replace(varSubstituivel, variaveisBanco[varSubstituivel]);
    }
    let valorTesteLinha = 0;
    let operadores = ladoDireito.match(pegarOperadores);
    // Adiciona ao valor da linha o valor dos operadores encontrados, caso existam
    for (let operador of operadores ?? []) {
        valorTesteLinha += operador.charCodeAt(0);
    }
    let operandos = ladoDireito.match(pegarOperandos);
    for (let operando of operandos ?? []) {
        // Busca os operandos e adiciona ao valor da linha a depender do tipo do operando
        let valorOperando = eval(operando);
        let tipoOperando = typeof valorOperando;
        // Caso seja um numero, adiciona ao valor da linha
        if (tipoOperando === "number") {
            valorTesteLinha += valorOperando;
        }
        else {
            // Caso contrario, adiciona o valor ascii de cada caractere ao valor da linha
            let valorTeste = 0;
            for (let caracter of valorOperando ?? []) {
                valorTeste += caracter.charCodeAt(0);
            }
            valorTesteLinha += valorTeste;
        }
    }
    // Calcula valor da variavel no programa
    let valorVariavel = eval(ladoDireito);
    let tipoVariavel = typeof valorVariavel;
    // Se for numero adiciona ao valor da linha e salva o resultado no banco
    if (tipoVariavel === "number") {
        let valorTesteVariavel = valorVariavel;
        valorTesteLinha += valorTesteVariavel;
        await banco.salvarVariavel(nomeVariavel, valorVariavel, valorTesteVariavel, idLinha);
    }
    else if (tipoVariavel === "string") {
        // Se for string, adiciona o valor ascci de cada caractere o valor da linha e salva o resultado no banco
        let valorTesteVariavel = 0;
        for (let caracter of valorVariavel ?? []) {
            valorTesteVariavel += caracter.charCodeAt(0);
        }
        valorTesteLinha += valorTesteVariavel;
        // Adiciona aspas para que o valor da variavel seja reconhecido como string antes de salvar no banco
        valorVariavel = `"${valorVariavel}"`;
        await banco.salvarVariavel(nomeVariavel, valorVariavel, valorTesteVariavel, idLinha);
    }
    else {
        // Se for array, adiciona cada valor do array no banco, referenciando a mesma variavel do programa atual
        let varId = undefined;
        // Para cada item do array e sua posicao no array
        for (let [index, valorPosição] of valorVariavel?.entries()) {
            let valorTesteVariavel = 0;
            // Mesmo caso de antes sobre valor da linha no caso de numero x string
            if (typeof valorPosição === "number")
                valorTesteVariavel = valorPosição;
            else
                for (let caracter of valorPosição ?? []) {
                    valorTesteVariavel += caracter.charCodeAt(0);
                }
            valorTesteLinha += valorTesteVariavel;
            // Salva o item atual do array no banco
            // Recebe o id da variavel para saber qual variavel esta sendo referenciada para os proximos itens do array
            varId = await banco.salvarVariavel(nomeVariavel, valorPosição, valorTesteVariavel, idLinha, index, varId);
        }
    }
    return Promise.resolve(valorTesteLinha + "=".codePointAt(0));
}
/**
 * Trata codigo que está dentro de if
 * @param linha Linha a ser tratada
 * @param idLinha Id da linha
 * @returns Valor da linha e se está na branch do if ou do else
 */
async function tratarIf(linha, idLinha) {
    const inicioIf = pegarInicioIf.exec(linha);
    const fimIf = pegarFimIf.exec(linha);
    // Remove inicio e/ou fim do if, caso existam
    let condicao = linha
        .replace(inicioIf ? inicioIf[0] : "" ?? "", "")
        .replace(fimIf ? fimIf[0] : "" ?? "", "");
    const strings = condicao.match(pegarString);
    let condicaoSemStrings = condicao;
    // Remove aspas simples ou duplas da string
    for (const st of strings ?? []) {
        condicaoSemStrings = condicaoSemStrings.replace(st, "");
    }
    // Substitui as variaveis pelos valores do banco
    const variaveisBanco = await banco.buscarVariaveis(idLinha);
    const variaveisSubstituiveis = condicaoSemStrings.match(pegarNomeVariavel);
    for (const varSubstituivel of variaveisSubstituiveis ?? []) {
        condicao = condicao.replace(varSubstituivel, variaveisBanco[varSubstituivel]);
    }
    let valorTesteLinha = 0;
    // Extrai os operadores da condicao
    const operadores = condicao.match(pegarOperadores);
    for (const operador of operadores ?? []) {
        valorTesteLinha += operador.charCodeAt(0);
    }
    // Extrai os operandos da condicao
    const operandos = condicao.match(pegarOperandos);
    for (const operando of operandos ?? []) {
        const valorOperando = eval(operando);
        const tipoOperando = typeof valorOperando;
        if (tipoOperando === "number") {
            valorTesteLinha += valorOperando;
        }
        else {
            let valorTeste = 0;
            for (const caracter of valorOperando)
                valorTeste += caracter.charCodeAt(0);
            valorTesteLinha += valorTeste;
        }
    }
    const valorCondicao = eval(condicao);
    // Adiciona 1 no valor final caso seja a branch do if
    if (valorCondicao)
        valorTesteLinha += 1;
    return Promise.resolve({ valorTesteLinha, valorCondicao });
}
/* ************* GET ************* */
app.get("/", function (_, res) {
    res.redirect("/aplicacao");
});
app.get("/aplicacao", function (_, res) {
    res.render(__dirname + "/views/aplicacao.ejs");
});
app.get("/resultado", function (_, res) {
    res.render(__dirname + "/views/resultado.ejs");
});
app.listen(port, () => {
    console.log(`SERVIDOR ATIVO, ACESSE http://localhost:${port}`);
});
