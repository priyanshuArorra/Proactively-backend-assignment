const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'hahahaha',
    database: 'reachout_db',
});

module.exports = pool;

