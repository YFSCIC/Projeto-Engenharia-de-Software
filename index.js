"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
//Expressões Regulares
const isFor = /^(\s*for\s*\()/g; // for(
const isSelecao = /^(\s*if\s*\()/g; // if(
const isAtribuicao = /^((\s*(let|var|const)\s){0,1}\s*[A-Za-z_]\w*\s*=)/g; // (let|var|const) nomeVariavel =
const nomeVariavel = /[A-Za-z_]\w*/g; // nomeVariavel
const capturarEsquerdo = /^((\s*(let|var|const)\s){0,1}\s*(?<nomeVariavel>[A-Za-z_]\w*)\s*=\s*)/g; // (let|var|const) nomeVariavel =
app.post("/programa", (request, response) => {
    let programa = request.body;
    if (programa.nome && programa.codigo && (programa.tipo === "o" || programa.tipo === "p")) {
        let idPrograma = banco.salvarPrograma(programa.nome);
        salvarLinhas(programa, idPrograma);
        response.status(201).send("Programa Gravado");
    }
    else {
        response.status(400).send("Dado Null");
    }
});
app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("[server]: http://localhost:" + port);
}));
function salvarLinhas(programa, idPrograma) {
    let linhas = programa.codigo.split('\n');
    for (let [numLinha, linha] of linhas.entries()) {
        const idLinha = banco.salvarLinha(numLinha, programa.tipo, linha, idPrograma);
        if (isAtribuicao.test(linha)) {
            tratarAtribuição(linha, idLinha);
        }
        else if (isSelecao.test(linha)) {
        }
        else if (isFor.test(linha)) {
        }
        else {
        }
    }
}
function tratarAtribuição(linha, idLinha) {
    var _a;
    let ladoEsquerdo = capturarEsquerdo.exec(linha);
    let ladoDireito = linha.replace(ladoEsquerdo[0], '');
    let variavel = (_a = ladoEsquerdo === null || ladoEsquerdo === void 0 ? void 0 : ladoEsquerdo.groups) === null || _a === void 0 ? void 0 : _a.nomeVariavel;
    let variaveisBanco = banco.buscarVariaveis(idLinha);
    let variaveisSubstituiveis = ladoDireito.match(nomeVariavel);
    for (let varSubstituivel of variaveisSubstituiveis) {
        ladoDireito = ladoDireito.replace(varSubstituivel, variaveisBanco[varSubstituivel]);
    }
    let valorVariavel = eval(ladoDireito);
    let tipoVariavel = typeof valorVariavel;
    if (tipoVariavel === 'number') {
        banco.salvarVariavel(variavel, valorVariavel, valorVariavel);
    }
    else if (tipoVariavel === 'string') {
        let valorTeste = 0;
        for (let v of valorVariavel)
            valorTeste += v.charCodeAt(0);
        banco.salvarVariavel(variavel, valorVariavel, valorTeste);
    }
    else {
        for (let [index, valor] of valorVariavel.entries()) {
            let valorTeste = 0;
            if (typeof valor === 'number')
                valorTeste = valor;
            else
                for (let caracter of valor)
                    valorTeste += caracter.charCodeAt(0);
            banco.salvarVariavel(variavel, valor, valorTeste, index);
        }
    }
}
