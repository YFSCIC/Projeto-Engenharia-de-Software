const { urlencoded } = require("express");
var express = require("express");
var app = express();
var dbCon = require('./db.js');
app.set("engine ejs", "ejs");

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/views'));
app.use(express.static('public'));

//rotas...
app.get("/", function(req, res) {

    var fun = [
        { nome: 'Victor', empresa: "UESC", ano: 2021 },
        { nome: 'Carlos', empresa: "Marketing max", ano: 2020 },
        { nome: 'Daniel', empresa: "Google", ano: 2018 }
    ];

    dbCon.query("SELECT * FROM pedidos", function(err, dado) {
        res.render(__dirname + "/views/index.ejs", {
            fun: fun,
            dado: dado
        });
    });

});

app.post("/inserir", function(req, res) {
    const sql = "INSERT INTO pedidos (sabores,status, valor,pizza_key,cliente_key, quantidade, tamanho) VALUES (?, ?, ?, ?, ?,?,?)";
    const dadosMestre = [req.body.sabores, req.body.status, req.body.valor, req.body.pizza_key, req.body.cliente_key, req.body.quantidade, req.body.tamanho];
    dbCon.query(sql, dadosMestre, function(err) {
        if (err) {
            return console.error(err.message);
        }
        res.redirect("/");
    });
});


app.post("/delete", function(req, res) {
    const idd = req.body.id;
    const sql = "DELETE FROM pedidos WHERE id= ?";
    dbCon.query(sql, idd, function(err) {
        if (err) {
            return console.error(err.message);
        }
        res.redirect("/")
    });
});


app.post("/editar", function(req, res) {
    const id = req.body.id; //Pega o id 
    const dados = [req.body.sabores, req.body.tamanho, req.body.quantidade, id];
    const sqle = "UPDATE pedidos SET sabores= ?,tamanho= ?,quantidade= ? WHERE (id= ?)";
    dbCon.query(sqle, dados, function(err) {
        if (err) {
            return console.error(err.message);
        }
        res.redirect("/");
    });
});


app.listen(3000, () => {
    console.log('SERVIDOR ATIVO, ACESSE http://localhost:3000');
});