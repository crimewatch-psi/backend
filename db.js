const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  multipleStatements: true,
});

connection.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database.");
  const sqlFile = path.join(__dirname, "crimewatch_full.sql");
  try {
    const sql = fs.readFileSync(sqlFile, "utf8");
    connection.query(sql, (err, results) => {
      if (err) {
        console.error("Error initializing database schema:", err);
        return;
      }
      console.log("Database schema initialized successfully");
    });
  } catch (err) {
    console.error("Error reading SQL file:", err);
  }
});

module.exports = connection;
