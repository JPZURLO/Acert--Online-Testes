import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'De182246@',
    database: 'acert'
});

connection.connect(err => {
    if (err) {
        console.error('❌ Erro ao conectar ao MySQL:', err);
        return;
    }
    console.log('✅ Conectado ao MySQL');
});

module.exports = connection;
