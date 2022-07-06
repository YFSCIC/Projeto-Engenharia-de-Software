import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { Banco } from "./banco";
import { randomInt } from "crypto";
var app = express();
var dbCon = require("./db.js");

dotenv.config();
const port = process.env.PORT || 5000;

app.set("engine ejs", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/views"));
app.use(express.static("public"));

const banco = new Banco();

// TRATAR PROGRAMAS
interface Programa {
  nome: string;
  readonly programa_o: string;
  readonly programa_p: string;
}

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
const pegarLadoEsquerdo =
  /^((\s*(let|var|const)\s)?\s*(?<nomeVariavel>[A-Za-z_]\w*)\s*=\s*)/; // (let|var|const) nomeVariavel =

app.post("/programa", async (request: Request, response: Response) => {
  const programa: Programa = request.body;

  if (programa?.programa_o || programa?.programa_p) {
    programa.nome = programa.nome ?? "nome" + randomInt(9999);
    // PROG O
    const idPrograma = await banco.salvarOuAtualizarPrograma(programa.nome);
    const valorTesteProgramaO = await salvarLinhas(
      programa.programa_o,
      "o",
      idPrograma
    );
    await banco.atualizarValorPrograma(programa.nome, valorTesteProgramaO, "o");

    // PROG O
    const valorTesteProgramaP = await salvarLinhas(
      programa.programa_p,
      "p",
      idPrograma
    );
    await banco.atualizarValorPrograma(programa.nome, valorTesteProgramaP, "p");

    response.status(201).send("Programa Gravado");
  } else {
    response.status(400).send("Dado Null");
  }
});

async function salvarLinhas(
  programa: string,
  tipo: "o" | "p",
  idPrograma: number
): Promise<number> {
  let ifTrue = false;
  let dentroIf = false;
  let ifAtivado = false;
  let procurandoElse = false;

  let valorTestePrograma = 0;

  const linhas = programa.split(process.platform !== "win32" ? "\r\n" : "\n");
  for (const [numLinha, linha] of linhas.entries()) {
    const idLinha = await banco.salvarLinha(
      numLinha + 1,
      tipo,
      linha + "\n",
      idPrograma
    );
    if (
      (ifAtivado && ifTrue && dentroIf) ||
      (ifAtivado && !ifTrue && !dentroIf) ||
      !ifAtivado
    ) {
      let valorTesteLinha = 0;
      if (isAtribuicao.test(linha)) {
        if (procurandoElse) {
          ifAtivado = false;
          procurandoElse = false;
        }
        valorTesteLinha = await tratarAtribuição(linha, idLinha);
      } else if (isIf.test(linha)) {
        const resultado = await tratarIf(linha, idLinha);

        valorTesteLinha = resultado.valorTesteLinha;
        ifTrue = resultado.valorCondicao;
        dentroIf = true;
        ifAtivado = true;
      } else if (isElse.test(linha)) {
        procurandoElse = false;
      } else if (isChave.test(linha)) {
        if (dentroIf) {
          dentroIf = false;
          procurandoElse = true;
        } else {
          ifAtivado = false;
        }
      }
      valorTestePrograma += valorTesteLinha;
      await banco.updateValorLinha(idLinha, valorTesteLinha);
    } else if (isElse.test(linha)) {
      procurandoElse = false;
    } else if (isChave.test(linha)) {
      if (dentroIf) {
        dentroIf = false;
        procurandoElse = true;
      } else {
        ifAtivado = false;
      }
    }
  }
  return Promise.resolve(valorTestePrograma);
}

async function tratarAtribuição(
  linha: string,
  idLinha: number
): Promise<number> {
  let ladoEsquerdo = pegarLadoEsquerdo.exec(linha);
  let ladoDireito = linha.replace(ladoEsquerdo[0], "");
  let nomeVariavel = ladoEsquerdo?.groups?.nomeVariavel;

  let strings = ladoDireito.match(pegarString);
  let ladoDireitoSemStrings = ladoDireito;
  for (let st of strings ?? []) {
    ladoDireitoSemStrings = ladoDireitoSemStrings.replace(st, "");
  }

  let variaveisBanco = await banco.buscarVariaveis(idLinha);
  let variaveisSubstituiveis = ladoDireitoSemStrings.match(pegarNomeVariavel);
  for (let varSubstituivel of variaveisSubstituiveis ?? []) {
    ladoDireito = ladoDireito.replace(
      varSubstituivel,
      variaveisBanco[varSubstituivel]
    );
  }

  let valorTesteLinha = 0;
  let operadores = ladoDireito.match(pegarOperadores);
  for (let operador of operadores ?? []) {
    valorTesteLinha += operador.charCodeAt(0);
  }

  let operandos = ladoDireito.match(pegarOperandos);
  for (let operando of operandos ?? []) {
    let valorOperando = eval(operando);
    let tipoOperando = typeof valorOperando;

    if (tipoOperando === "number") {
      valorTesteLinha += valorOperando;
    } else {
      let valorTeste = 0;

      for (let caracter of valorOperando ?? []) {
        valorTeste += caracter.charCodeAt(0);
      }

      valorTesteLinha += valorTeste;
    }
  }

  let valorVariavel = eval(ladoDireito);
  let tipoVariavel = typeof valorVariavel;
  if (tipoVariavel === "number") {
    let valorTesteVariavel = valorVariavel;

    valorTesteLinha += valorTesteVariavel;
    await banco.salvarVariavel(
      nomeVariavel,
      valorVariavel,
      valorTesteVariavel,
      idLinha
    );
  } else if (tipoVariavel === "string") {
    let valorTesteVariavel = 0;

    for (let caracter of valorVariavel ?? []) {
      valorTesteVariavel += caracter.charCodeAt(0);
    }

    valorTesteLinha += valorTesteVariavel;
    valorVariavel = `"${valorVariavel}"`;

    await banco.salvarVariavel(
      nomeVariavel,
      valorVariavel,
      valorTesteVariavel,
      idLinha
    );
  } else {
    let varId = undefined;
    for (let [index, valorPosição] of valorVariavel?.entries()) {
      let valorTesteVariavel = 0;

      if (typeof valorPosição === "number") valorTesteVariavel = valorPosição;
      else
        for (let caracter of valorPosição ?? []) {
          valorTesteVariavel += caracter.charCodeAt(0);
        }

      valorTesteLinha += valorTesteVariavel;
      varId = await banco.salvarVariavel(
        nomeVariavel,
        valorPosição,
        valorTesteVariavel,
        idLinha,
        index,
        varId
      );
    }
  }
  return Promise.resolve(valorTesteLinha + "=".codePointAt(0));
}

async function tratarIf(
  linha: string,
  idLinha: number
): Promise<{ valorTesteLinha: number; valorCondicao: boolean }> {
  const inicioIf = pegarInicioIf.exec(linha);
  const fimIf = pegarFimIf.exec(linha);
  let condicao = linha
    .replace(inicioIf?.at(0) ?? "", "")
    .replace(fimIf?.at(0) ?? "", "");

  const strings = condicao.match(pegarString);
  let condicaoSemStrings = condicao;
  for (const st of strings ?? [])
    condicaoSemStrings = condicaoSemStrings.replace(st, "");

  const variaveisBanco = await banco.buscarVariaveis(idLinha);
  const variaveisSubstituiveis = condicaoSemStrings.match(pegarNomeVariavel);
  for (const varSubstituivel of variaveisSubstituiveis ?? []) {
    condicao = condicao.replace(
      varSubstituivel,
      variaveisBanco[varSubstituivel]
    );
  }

  let valorTesteLinha = 0;
  const operadores = condicao.match(pegarOperadores);
  for (const operador of operadores ?? [])
    valorTesteLinha += operador.charCodeAt(0);

  const operandos = condicao.match(pegarOperandos);
  for (const operando of operandos ?? []) {
    const valorOperando = eval(operando);
    const tipoOperando = typeof valorOperando;

    if (tipoOperando === "number") {
      valorTesteLinha += valorOperando;
    } else {
      let valorTeste = 0;

      for (const caracter of valorOperando)
        valorTeste += caracter.charCodeAt(0);

      valorTesteLinha += valorTeste;
    }
  }
  const valorCondicao = eval(condicao);
  if (valorCondicao) valorTesteLinha += 1;

  return Promise.resolve({ valorTesteLinha, valorCondicao });
}

//rotas...

/* ************* GET ************* */

app.get("/", function (req, res) {
  res.redirect("/aplicacao");
});

app.get("/aplicacao", function (req, res) {
  res.render(__dirname + "/views/aplicacao.ejs");
});

app.get("/resultado", function (req, res) {
  res.render(__dirname + "/views/resultado.ejs");
});

/* ************* POST ************* */

app.post("/inserir", function (req, res) {
  const sql =
    "INSERT INTO pedidos (sabores,status, valor,pizza_key,cliente_key, quantidade, tamanho) VALUES (?, ?, ?, ?, ?,?,?)";
  const dadosMestre = [
    req.body.sabores,
    req.body.status,
    req.body.valor,
    req.body.pizza_key,
    req.body.cliente_key,
    req.body.quantidade,
    req.body.tamanho,
  ];
  dbCon.query(sql, dadosMestre, function (err) {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/");
  });
});

app.post("/delete", function (req, res) {
  const idd = req.body.id;
  const sql = "DELETE FROM pedidos WHERE id= ?";
  dbCon.query(sql, idd, function (err) {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/");
  });
});

app.post("/editar", function (req, res) {
  const id = req.body.id; //Pega o id
  const dados = [req.body.sabores, req.body.tamanho, req.body.quantidade, id];
  const sqle =
    "UPDATE pedidos SET sabores= ?,tamanho= ?,quantidade= ? WHERE (id= ?)";
  dbCon.query(sqle, dados, function (err) {
    if (err) {
      return console.error(err.message);
    }
    res.redirect("/");
  });
});

app.listen(port, () => {
  console.log(`SERVIDOR ATIVO, ACESSE http://localhost:${port}`);
});
