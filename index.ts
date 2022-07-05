const { urlencoded } = require("express");
import dotenv from "dotenv";
var express = require("express");
var app = express();
var dbCon = require("./db.js");

dotenv.config();
const port = process.env.PORT;

app.set("engine ejs", "ejs");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/views"));
app.use(express.static("public"));

//rotas...

/* ************* GET ************* */

app.get("/", function (req, res) {
  res.redirect("/aplicacao");
});

app.get("/aplicacao", function (req, res) {
  res.render(__dirname + "/views/aplicacao.ejs");
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
