var mysql = require('mysql');

var conexao = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pizzaria',
    multipleStatements: true
});

conexao.connect();
module.exports = conexao;