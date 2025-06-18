const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'passwordmu',
  database: 'CrimeWatch'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to CrimeWatch database.');
});

module.exports = connection;