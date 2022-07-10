"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dbCon = require("./db.js");
/**
 * Salva ou atualiza a variável
 * @param nome Nome do programa
 * @param valor Valor real da variavel no programa
 * @param valorTeste Valor calculado da variavel
 * @param idLinha Id da linha do programa
 * @param index Index do item do array, caso exista
 * @param varId Id da variavel, para quando for array
 * @returns Id da variável salva no banco
 */
async function salvarVariavel(nome, valor, valorTeste, idLinha, index, varId) {
    return new Promise(async (resolve) => {
        // INSERIR VARIAVE(IS) DA LINHA ATUAL
        const existeSql = "SELECT id FROM variavel WHERE nome_variavel = ?";
        const existeDados = [nome];
        // Verifica se a variável já existe (array)
        let existeId = await new Promise((resolve2, reject2) => {
            dbCon.query(existeSql, existeDados, function (err, res) {
                if (err) {
                    console.log(`SELECT id FROM variavel WHERE nome = ${nome}: ${err.message}`);
                    reject2(err.message);
                }
                if (res?.length > 0) {
                    resolve2(res[0].id);
                }
                else {
                    resolve2(0);
                }
            });
        });
        // Se não existe, insere uma nova variável no banco
        if (!varId && existeId === 0) {
            varId = await new Promise(async (resolve3, reject3) => {
                const variavelSql = "INSERT INTO variavel (id, nome_variavel, is_array, linha_codigo_id) VALUES (0, ?, ?, ?)";
                let dados = [nome, index !== undefined ? 1 : 0, idLinha];
                dbCon.query(variavelSql, dados, function (err, res) {
                    if (err) {
                        console.log(`INSERT INTO variavel VALUES (0, ?, ?, ?): ${err.message}`);
                        reject3(err.message);
                    }
                    resolve3(res.insertId);
                });
            });
        }
        // Insere o valor da variavel se for array
        if (existeId === 0 || index !== undefined) {
            await new Promise(async (resolve4, reject4) => {
                const valorSql = "INSERT INTO valor_variavel (id, indice, valor_decimal, valor_literal, variavel_id) VALUES (0, ?, ?, ?, ?)";
                let dadoss = [index, valorTeste, valor.toString(), varId];
                dbCon.query(valorSql, dadoss, function (err) {
                    if (err) {
                        console.log(`INSERT INTO valor VALUES (0, ?, ?, ?, ?): ${err.message}`);
                        reject4(err.message);
                    }
                    resolve4();
                });
            });
        }
        else {
            // Atualiza o valor da variável se não for array
            await new Promise(async (resolve5, reject5) => {
                const valorSql = "UPDATE valor_variavel SET indice = ?, valor_decimal = ?, valor_literal = ? WHERE variavel_id = ?";
                let dadoss = [index, valorTeste, valor.toString(), Number(existeId)];
                dbCon.query(valorSql, dadoss, function (err) {
                    if (err) {
                        console.log(`UPDATE valor_variavel SET indice = ?, valor_decimal = ?, valor_literal WHERE variavel_id = ?: ${err.message}`);
                        reject5(err.message);
                    }
                    resolve5();
                });
            });
        }
        resolve(varId);
    });
}
/**
 * Busca todas variaveis do programa no banco
 * @param idLinha Id da linha do programa
 * @returns Objeto com todas as variaveis do programa (ex: {"minhaVarString": "uma string", "minhaOutraVarNumero": 12})
 */
async function buscarVariaveis(idLinha) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT v.nome_variavel, vv.valor_literal FROM variavel v INNER JOIN valor_variavel vv ON v.id = vv.variavel_id WHERE v.linha_codigo_id = ? AND v.is_array = 0";
        const dados = [idLinha];
        let variaveis = {};
        dbCon.query(sql, dados, function (err, res) {
            if (err) {
                console.log(`SELECT v.nome_variavel, vv.valor_literal FROM variavel v INNER JOIN valor_variavel vv ON v.id = vv.variavel_id WHERE v.linha_codigo_id = ? AND v.is_array = 0: ${err.message}`);
                reject(err.message);
            }
            res.forEach((v) => {
                variaveis[v.nome_variavel] = v.valor_literal;
            });
            resolve(variaveis);
        });
    });
}
/**
 * Atualiza o valor da variável na linha `id` do programa
 * @param id Id da linha do programa
 * @param valorTesteLinha Valor calculado da linha
 */
async function updateValorLinha(id, valorTesteLinha) {
    return new Promise((resolve, reject) => {
        const sql = "UPDATE linha_codigo SET valor = ? WHERE id = ?";
        const dados = [valorTesteLinha, id];
        dbCon.query(sql, dados, function (err) {
            if (err) {
                console.log(`UPDATE linha_codigo SET valor = ? WHERE id = ?: ${err.message}`);
                reject(err.message);
            }
            resolve();
        });
    });
}
/**
 * Salva a linha do programa no banco
 * @param numLinha Número da linha do programa
 * @param tipo Tipo da linha (o ou p)
 * @param linha Linha do programa
 * @param idPrograma Id do programa
 * @returns Id da linha do programa salva no banco
 */
async function salvarLinha(numLinha, tipo, linha, idPrograma) {
    return new Promise(async (resolve) => {
        let newId = await new Promise((resolve2, reject2) => {
            const sql = "INSERT INTO linha_codigo (id, num_linha, is_codigo_p, texto_linha, programa_id) VALUES (0, ?, ?, ?, ?)";
            const dados = [numLinha, tipo === "p" ? 1 : 0, linha, idPrograma];
            dbCon.query(sql, dados, function (err, res) {
                if (err) {
                    console.log(`INSERT INTO linha_codigo VALUES (0, ?, ?, ?, ?): ${err.message}`);
                    reject2(err.message);
                }
                resolve2(res.insertId);
            });
        });
        // Busca todas as variaveis da linha
        let vares = await new Promise((resolve3, reject3) => {
            const varesSql = "SELECT id FROM variavel WHERE linha_codigo_id = ?";
            const varesDados = [newId - 1];
            dbCon.query(varesSql, varesDados, function (err, res) {
                if (err) {
                    console.log(`SELECT id FROM variavel WHERE linha_codigo_id = ?: ${err.message}`);
                    reject3(err.message);
                }
                resolve3(res?.map((v) => v.id));
            });
        });
        // Salva/atualiza os valores das variaveis da linha
        let atualizaDados = [newId, 0];
        const atualiza = "UPDATE variavel SET linha_codigo_id = ? WHERE id = ?";
        for (const v of vares) {
            await new Promise((resolve4, reject4) => {
                atualizaDados[1] = v;
                dbCon.query(atualiza, atualizaDados, function (err) {
                    if (err) {
                        console.log(`UPDATE variavel SET linha_codigo_id = ? WHERE id in ?: ${err.message}`);
                        reject4(err.message);
                    }
                    resolve4();
                });
            });
        }
        resolve(newId);
    });
}
/**
 * Atualiza o valor calculado do programa `nome`
 * @param nome Nome da variável
 * @param valorTeste Valor calculado da variável
 * @param tipo Tipo da variável (o ou p)
 */
async function atualizarValorPrograma(nome, valorTeste, tipo) {
    return new Promise(async (resolve, reject) => {
        const sql = `UPDATE programa SET valor_${tipo} = ? WHERE nome = ?`;
        const dados = [valorTeste, nome];
        dbCon.query(sql, dados, function (err) {
            if (err) {
                console.log(`UPDATE programa SET valor_${tipo} = ? WHERE nome = ?: ${err.message}`);
                reject(err.message);
            }
            resolve();
        });
    });
}
/**
 * Salva/atualiza o programa no banco
 * @param programaNome Nome do programa
 * @returns Id do programa salvo/atualizado no banco
 */
async function salvarOuAtualizarPrograma(programaNome) {
    return new Promise((resolve, reject) => {
        const sql = "INSERT INTO programa (id, nome) VALUES (0, ?)";
        const dados = [programaNome];
        dbCon.query(sql, dados, function (err, res) {
            if (err) {
                console.log(`INSERT INTO programa (id, nome) VALUES (0, ?): ${err.message}`);
                reject(err.message);
            }
            resolve(res.insertId);
        });
    });
}
module.exports.salvarOuAtualizarPrograma = salvarOuAtualizarPrograma;
module.exports.atualizarValorPrograma = atualizarValorPrograma;
module.exports.salvarLinha = salvarLinha;
module.exports.updateValorLinha = updateValorLinha;
module.exports.buscarVariaveis = buscarVariaveis;
module.exports.salvarVariavel = salvarVariavel;
