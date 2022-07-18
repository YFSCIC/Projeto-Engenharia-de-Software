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

// TRATAR PROGRAMAS
interface Programa {
  nome: string;
  readonly programa_o: string;
  readonly programa_p: string;
}

//Expressões Regulares
const isIf = /^(\s*if\s*\()/g; // if(
const isElse = /^((\s*\})?\s*else\s*\{?)/g; // else | } else
const isChave = /\s*\}\s*/g; // }
const isAtribuicao = /^((\s*(let|var|const)\s)?\s*[A-Za-z_]\w*\s*=)/; // (let|var|const) nomeVariavel =
const pegarFimIf = /(\s*\)\s*\{?)$/; // ) {
const pegarInicioIf = /^(\s*if\s*\(\s*)/; // if (
const pegarOperandos = /(['"])\w*(['"])|\d+(\.\d+)?/g; // strings e números
const pegarOperadores = /\+|\-|\*\//g; // +|-|*|/
const pegarString = /(['"]).*(['"])/g; // Strings
const pegarNomeVariavel = /[A-Za-z_]\w*/g; // Nome da variavel
const pegarLadoEsquerdo =
  /^((\s*(let|var|const)\s)?\s*(?<nomeVariavel>[A-Za-z_]\w*)\s*=\s*)/; // (let|var|const) nomeVariavel = + o nome da variável que receberá o valor


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

    // Checa se a linha faz parte de um if else: ifAtivado
    // Checa se a condicional é verdadeira ou falsa, ou seja, se true deve executar linhas do if e se false deve executa apenas linhas do else: ifTrue
    // Checa se esta dentro do if ou do else: dentroIf
    // Logo esse if testa se eu estou em uma estrutura if else e se eu devo ou não executar a linha com base na condição do if e com base em qual parte estou, se no if ou no else
    if ((ifAtivado && ifTrue && dentroIf) || (ifAtivado && !ifTrue && !dentroIf) || !ifAtivado) {
      let valorTesteLinha = 0;
      // Testa se a linha é uma atribuição
      if (isAtribuicao.test(linha)) {
        // Caso tenha esteja procurando um else após ter encerrado um if e encontre uma linha diferente do else isso significa que essa estrutura não tem else, apenas if
        if (procurandoElse) {
          ifAtivado = false;
          procurandoElse = false;
        }
        valorTesteLinha = await tratarAtribuição(linha, idLinha);
      }
      // Testa se a linha é um if
      else if (isIf.test(linha)) {
        const resultado = await tratarIf(linha, idLinha);

        // Ativa uma estrutura if else
        valorTesteLinha = resultado.valorTesteLinha;
        ifTrue = resultado.valorCondicao;
        dentroIf = true;
        ifAtivado = true;
      }
      // Testa se a linha é um else
      else if (isElse.test(linha)) {
        procurandoElse = false;
      }
      // Testa se a linha é um }
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
    // Testa se a linha é um else
    else if (isElse.test(linha)) {
      // Checa se na linha que se inicia o else termina o if, ou seja: se é "} else" ou "else"
      if (isChave.test(linha)) {
        if (dentroIf) {
          dentroIf = false;
          procurandoElse = true;
        }
        else {
          ifAtivado = false;
        }
      }
      procurandoElse = false;
    }
    // Testa se a linha é um }
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

  // Busca strings no lado direito da atribuicao, por exemplo: "sou uma string"
  let strings = ladoDireito.match(pegarString);
  let ladoDireitoSemStrings = ladoDireito;
  for (let st of strings ?? []) {
    // Remove as string
    ladoDireitoSemStrings = ladoDireitoSemStrings.replace(st, "");
  }

  // Busca variaveis desse programa que ja existem no banco
  let variaveisBanco = await banco.buscarVariaveis(idLinha);
  // Buscar todos os nomes que encontrar no lado direito, excluíndo strings
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
    // Converter os números para valor literal, antes eles estavam como string
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

  // Calcula valor da variavel, ou seja, pega o que esta do lado direito da igualdade e executa
  let valorVariavel = eval(ladoDireito);
  let tipoVariavel = typeof valorVariavel;
  // Se for numero adiciona ao valor da linha e salva o resultado no banco
  if (tipoVariavel === "number") {
    let valorTesteVariavel = valorVariavel;

    valorTesteLinha += valorTesteVariavel;
    await banco.salvarVariavel(
      nomeVariavel,
      valorVariavel,
      valorTesteVariavel,
      idLinha
    );
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

      // // Se for numero adiciona o valor
      if (typeof valorPosição === "number") {
        valorTesteVariavel = valorPosição;
      }
      else {
        // Se for string, adiciona o valor ascci de cada caractere ao valor
        for (let caracter of valorPosição ?? []) {
          valorTesteVariavel += caracter.charCodeAt(0);
        }
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
 * @returns Valor da linha e se é true ou false a condicional do if para saber qual dos dois será executada
 */
async function tratarIf(linha: string, idLinha: number): Promise<{ valorTesteLinha: number; valorCondicao: boolean }> {
  const inicioIf = pegarInicioIf.exec(linha);
  const fimIf = pegarFimIf.exec(linha);
  // Remove inicio e fim do if
  let condicao = linha
    .replace(inicioIf ? inicioIf[0] : "" ?? "", "")
    .replace(fimIf ? fimIf[0] : "" ?? "", "");

  // Busca strings na condicional
  const strings = condicao.match(pegarString);
  let condicaoSemStrings = condicao;
  for (const st of strings ?? []) {
    // Remove as string
    condicaoSemStrings = condicaoSemStrings.replace(st, "");
  }

  // Substitui as variaveis pelos valores do banco
  const variaveisBanco = await banco.buscarVariaveis(idLinha);
  // Buscar todos os nomes que encontrar na condição, excluíndo strings
  const variaveisSubstituiveis = condicaoSemStrings.match(pegarNomeVariavel);
  // Substitui as variaveis pelos valores do banco
  for (const varSubstituivel of variaveisSubstituiveis ?? []) {
    condicao = condicao.replace(varSubstituivel, variaveisBanco[varSubstituivel]);
  }

  let valorTesteLinha = 0;
  const operadores = condicao.match(pegarOperadores);
  // Adiciona ao valor da linha o valor dos operadores encontrados, caso existam
  for (const operador of operadores ?? []) {
    valorTesteLinha += operador.charCodeAt(0);
  }

  const operandos = condicao.match(pegarOperandos);
  for (const operando of operandos ?? []) {
    // Converter os números para valor literal, antes eles estavam como string
    const valorOperando = eval(operando);
    const tipoOperando = typeof valorOperando;

    // Caso seja um numero, adiciona ao valor da linha
    if (tipoOperando === "number") {
      valorTesteLinha += valorOperando;
    }
    else {
      // Caso contrario, adiciona o valor ascii de cada caractere ao valor da linha
      let valorTeste = 0;

      for (const caracter of valorOperando)
        valorTeste += caracter.charCodeAt(0);

      valorTesteLinha += valorTeste;
    }
  }
  // Calcula valor da condicional, se true ou false
  const valorCondicao = eval(condicao);
  // Caso a condicional seja verdadeira some 1 a linha
  if (valorCondicao) valorTesteLinha += 1;

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
