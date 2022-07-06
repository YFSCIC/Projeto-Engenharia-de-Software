var dbCon = require("./db.js");

type Tipo = "o" | "p";
export interface Variavel {
  [nome: string]: any;
}

export class Banco {
  async salvarVariavel(
    nome: string,
    valor: number | string,
    valorTeste: number,
    idLinha: number,
    index?: number,
    varId?: number
  ): Promise<number> {
    return new Promise(async (resolve) => {
      // INSERIR VARIAVE(IS) DA LINHA ATUAL
      const existeSql = "SELECT id FROM variavel WHERE nome_variavel = ?";
      const existeDados = [nome];
      let existeId = await new Promise((resolve2, reject2) => {
        dbCon.query(existeSql, existeDados, function (err, res) {
          if (err) {
            console.log(
              `SELECT id FROM variavel WHERE nome = ${nome}: ${err.message}`
            );
            reject2(err.message);
          }
          if (res?.length > 0) {
            resolve2(res[0].id);
          } else {
            resolve2(0);
          }
        });
      });

      if (!varId && existeId === 0) {
        varId = await new Promise(async (resolve3, reject3) => {
          const variavelSql =
            "INSERT INTO variavel (id, nome_variavel, is_array, linha_codigo_id) VALUES (0, ?, ?, ?)";
          let dados = [nome, index !== undefined ? 1 : 0, idLinha];
          dbCon.query(variavelSql, dados, function (err, res) {
            if (err) {
              console.log(
                `INSERT INTO variavel VALUES (0, ?, ?, ?): ${err.message}`
              );
              reject3(err.message);
            }
            resolve3(res.insertId);
          });
        });
      }

      if (existeId === 0 || index !== undefined) {
        await new Promise<void>(async (resolve4, reject4) => {
          const valorSql =
            "INSERT INTO valor_variavel (id, indice, valor_decimal, valor_literal, variavel_id) VALUES (0, ?, ?, ?, ?)";
          let dadoss = [index, valorTeste, valor.toString(), varId];
          dbCon.query(valorSql, dadoss, function (err) {
            if (err) {
              console.log(
                `INSERT INTO valor VALUES (0, ?, ?, ?, ?): ${err.message}`
              );
              reject4(err.message);
            }
            resolve4();
          });
        });
      } else {
        await new Promise<void>(async (resolve5, reject5) => {
          const valorSql =
            "UPDATE valor_variavel SET indice = ?, valor_decimal = ?, valor_literal = ? WHERE variavel_id = ?";
          let dadoss = [index, valorTeste, valor.toString(), Number(existeId)];
          dbCon.query(valorSql, dadoss, function (err) {
            if (err) {
              console.log(
                `UPDATE valor_variavel SET indice = ?, valor_decimal = ?, valor_literal WHERE variavel_id = ?: ${err.message}`
              );
              reject5(err.message);
            }
            resolve5();
          });
        });
      }

      resolve(varId);
    });
  }

  async buscarVariaveis(idLinha: number): Promise<Variavel> {
    return new Promise((resolve, reject) => {
      const sql =
        "SELECT v.nome_variavel, vv.valor_literal FROM variavel v INNER JOIN valor_variavel vv ON v.id = vv.variavel_id WHERE v.linha_codigo_id = ? AND v.is_array = 0";
      const dados = [idLinha];
      let variaveis: Variavel = {};
      dbCon.query(sql, dados, function (err, res) {
        if (err) {
          console.log(
            `SELECT v.nome_variavel, vv.valor_literal FROM variavel v INNER JOIN valor_variavel vv ON v.id = vv.variavel_id WHERE v.linha_codigo_id = ? AND v.is_array = 0: ${err.message}`
          );
          reject(err.message);
        }
        res.forEach((v) => {
          variaveis[v.nome_variavel] = v.valor_literal;
        });
        resolve(variaveis);
      });
    });
  }

  async updateValorLinha(id: number, valorTesteLinha: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = "UPDATE linha_codigo SET valor = ? WHERE id = ?";
      const dados = [valorTesteLinha, id];
      dbCon.query(sql, dados, function (err) {
        if (err) {
          console.log(
            `UPDATE linha_codigo SET valor = ? WHERE id = ?: ${err.message}`
          );
          reject(err.message);
        }
        resolve();
      });
    });
  }

  async salvarLinha(
    numLinha: number,
    tipo: Tipo,
    linha: string,
    idPrograma: number
  ): Promise<number> {
    return new Promise(async (resolve) => {
      let newId: number = await new Promise((resolve2, reject2) => {
        const sql =
          "INSERT INTO linha_codigo (id, num_linha, is_codigo_p, texto_linha, programa_id) VALUES (0, ?, ?, ?, ?)";
        const dados = [numLinha, tipo === "p" ? 1 : 0, linha, idPrograma];
        dbCon.query(sql, dados, function (err, res) {
          if (err) {
            console.log(
              `INSERT INTO linha_codigo VALUES (0, ?, ?, ?, ?): ${err.message}`
            );
            reject2(err.message);
          }
          resolve2(res.insertId);
        });
      });

      let vares: number[] = await new Promise((resolve3, reject3) => {
        const varesSql = "SELECT id FROM variavel WHERE linha_codigo_id = ?";
        const varesDados = [newId - 1];
        dbCon.query(varesSql, varesDados, function (err, res) {
          if (err) {
            console.log(
              `SELECT id FROM variavel WHERE linha_codigo_id = ?: ${err.message}`
            );
            reject3(err.message);
          }
          resolve3(res?.map((v) => v.id));
        });
      });

      let atualizaDados = [newId, 0];
      const atualiza = "UPDATE variavel SET linha_codigo_id = ? WHERE id = ?";
      for (const v of vares) {
        await new Promise<void>((resolve4, reject4) => {
          atualizaDados[1] = v;
          dbCon.query(atualiza, atualizaDados, function (err) {
            if (err) {
              console.log(
                `UPDATE variavel SET linha_codigo_id = ? WHERE id in ?: ${err.message}`
              );
              reject4(err.message);
            }
            resolve4();
          });
        });
      }

      resolve(newId);
    });
  }

  async atualizarValorPrograma(
    nome: string,
    valorTeste: number,
    tipo: Tipo
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const sql = `UPDATE programa SET valor_${tipo} = ? WHERE nome = ?`;
      const dados = [valorTeste, nome];
      dbCon.query(sql, dados, function (err) {
        if (err) {
          console.log(
            `UPDATE programa SET valor_${tipo} = ? WHERE nome = ?: ${err.message}`
          );
          reject(err.message);
        }
        resolve();
      });
    });
  }

  salvarOuAtualizarPrograma(programaNome: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const sql = "INSERT INTO programa (id, nome) VALUES (0, ?)";
      const dados = [programaNome];
      dbCon.query(sql, dados, function (err, res) {
        if (err) {
          console.log(
            `INSERT INTO programa (id, nome) VALUES (0, ?): ${err.message}`
          );
          reject(err.message);
        }
        resolve(res.insertId);
      });
    });
  }
}
