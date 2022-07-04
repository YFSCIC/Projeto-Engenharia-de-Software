import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


interface Programa {
  readonly nome: string;
  readonly codigo: string;
  readonly tipo: 'o' | 'p';
}


//Expressões Regulares
const isIf = /^(\s*if\s*\()/g; // if(
const isElse = /^(\s*else\s*\{{0,1})/g; // while(
const isChave = /\s*\}\s*/g; // Fecha chaves
const isAtribuicao = /^((\s*(let|var|const)\s){0,1}\s*[A-Za-z_]\w*\s*=)/g; // (let|var|const) nomeVariavel =
const pegarFimIf = /(\s*\)\s*\{{0,1})$/g; // Fim do if
const pegarInicioIf = /^(\s*if\s*\(\s*)/g; // Início do if
const pegarOperandos = /('|")\w*('|")|\d+(\.\d+){0,1}/g; // Operandos de uma expressão
const pegarOperadores = /\+|\-|\*|\//g; // +|-|*|/
const pegarString = /('|").*('|")/g; // Strings
const pegarNomeVariavel = /[A-Za-z_]\w*/g; // Nome da variavel
const pegarLadoEsquerdo = /^((\s*(let|var|const)\s){0,1}\s*(?<nomeVariavel>[A-Za-z_]\w*)\s*=\s*)/g; // (let|var|const) nomeVariavel =


app.post("/programa", (request: Request, response: Response) => {
  let programa: Programa = request.body;
  if (programa.nome && programa.codigo && (programa.tipo === "o" || programa.tipo === "p")) {
    let idPrograma = banco.salvarOuAtualizarPrograma(programa.nome);
    let valorTestePrograma = salvarLinhas(programa, idPrograma);
    banco.atualizarValorPrograma(valorTestePrograma, programa.tipo);

    response.status(201).send("Programa Gravado");
  }
  else {
    response.status(400).send("Dado Null");
  }
});


app.listen(port, async () => {
  console.log("[server]: http://localhost:" + port);
});


function salvarLinhas(programa: Programa, idPrograma: number): number {
  let ifTrue = false;
  let dentroIf = false;
  let ifAtivado = false;
  let procurandoElse = false;

  let valorTestePrograma = 0
  let linhas = programa.codigo.split('\n');
  for (let [numLinha, linha] of linhas.entries()) {
    let idLinha = banco.salvarLinha(numLinha, programa.tipo, linha + '\n', idPrograma);
    if ((ifAtivado && ifTrue && dentroIf) || (ifAtivado && !ifTrue && !dentroIf) || !ifAtivado) {
      let valorTesteLinha = 0;
      if (isAtribuicao.test(linha)) {
        if (procurandoElse) {
          ifAtivado = false
          procurandoElse = false
        }
        valorTesteLinha = tratarAtribuição(linha, idLinha);
      }
      else if (isIf.test(linha)) {
        let resultado = tratarIf(linha, idLinha);

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
      banco.updateValorLinha(valorTesteLinha);
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
  return valorTestePrograma;
}


function tratarAtribuição(linha: string, idLinha: number): number {
  let ladoEsquerdo = pegarLadoEsquerdo.exec(linha);
  let ladoDireito = linha.replace(ladoEsquerdo[0], '');
  let nomeVariavel = ladoEsquerdo?.groups?.nomeVariavel;

  let strings = ladoDireito.match(pegarString);
  let ladoDireitoSemStrings = ladoDireito
  for (let st of strings)
    ladoDireitoSemStrings = ladoDireitoSemStrings.replace(st, '');

  let variaveisBanco = banco.buscarVariaveis(idLinha);
  let variaveisSubstituiveis = ladoDireitoSemStrings.match(pegarNomeVariavel);
  for (let varSubstituivel of variaveisSubstituiveis)
    ladoDireito = ladoDireito.replace(varSubstituivel, variaveisBanco[varSubstituivel]);

  let valorTesteLinha = 0;
  let operadores = ladoDireito.match(pegarOperadores);
  for (let operador of operadores)
    valorTesteLinha += operador.charCodeAt(0);

  let operandos = ladoDireito.match(pegarOperandos);
  for (let operando of operandos) {
    let valorOperando = eval(operando);
    let tipoOperando = typeof valorOperando;

    if (tipoOperando === 'number') {
      valorTesteLinha += valorOperando;
    }
    else {
      let valorTeste = 0;

      for (let caracter of valorOperando)
        valorTeste += caracter.charCodeAt(0);

      valorTesteLinha += valorTeste;
    }
  }

  let valorVariavel = eval(ladoDireito);
  let tipoVariavel = typeof valorVariavel;
  if (tipoVariavel === 'number') {
    let valorTesteVariavel = valorVariavel

    valorTesteLinha += valorTesteVariavel;
    banco.salvarVariavel(nomeVariavel, valorVariavel, valorTesteVariavel);
  }
  else if (tipoVariavel === 'string') {
    let valorTesteVariavel = 0;

    for (let caracter of valorVariavel)
      valorTesteVariavel += caracter.charCodeAt(0);

    valorTesteLinha += valorTesteVariavel;
    banco.salvarVariavel(nomeVariavel, valorVariavel, valorTesteVariavel);
  }
  else {
    for (let [index, valorPosição] of valorVariavel.entries()) {
      let valorTesteVariavel = 0;

      if (typeof valorPosição === 'number')
        valorTesteVariavel = valorPosição;
      else
        for (let caracter of valorPosição)
          valorTesteVariavel += caracter.charCodeAt(0);

      valorTesteLinha += valorTesteVariavel;
      banco.salvarVariavel(nomeVariavel, valorPosição, valorTesteVariavel, index);
    }
  }
  return valorTesteLinha;
}


function tratarIf(linha: string, idLinha: number): { valorTesteLinha: number, valorCondicao: boolean } {
  let inicioIf = pegarInicioIf.exec(linha);
  let fimIf = pegarFimIf.exec(linha);
  let condicao = linha.replace(inicioIf[0], '').replace(fimIf[0], '');

  let strings = condicao.match(pegarString);
  let condicaoSemStrings = condicao
  for (let st of strings)
    condicaoSemStrings = condicaoSemStrings.replace(st, '');

  let variaveisBanco = banco.buscarVariaveis(idLinha);
  let variaveisSubstituiveis = condicaoSemStrings.match(pegarNomeVariavel);
  for (let varSubstituivel of variaveisSubstituiveis)
    condicao = condicao.replace(varSubstituivel, variaveisBanco[varSubstituivel]);

  let valorTesteLinha = 0;
  let operadores = condicao.match(pegarOperadores);
  for (let operador of operadores)
    valorTesteLinha += operador.charCodeAt(0);

  let operandos = condicao.match(pegarOperandos);
  for (let operando of operandos) {
    let valorOperando = eval(operando);
    let tipoOperando = typeof valorOperando;

    if (tipoOperando === 'number') {
      valorTesteLinha += valorOperando;
    }
    else {
      let valorTeste = 0;

      for (let caracter of valorOperando)
        valorTeste += caracter.charCodeAt(0);

      valorTesteLinha += valorTeste;
    }
  }
  let valorCondicao = eval(condicao);
  if (valorCondicao) valorTesteLinha += 1

  return { valorTesteLinha, valorCondicao }
}
