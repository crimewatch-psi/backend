const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const connection = mysql.createConnection({
  url: process.env.MYSQLURL,
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  multipleStatements: false,
});

connection.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to database.");

  // const sqlFile = path.join(__dirname, "crimewatch_full.sql");
  // try {
  //   let sql = fs.readFileSync(sqlFile, "utf8");

  //   sql = sql
  //     .replace(/DELIMITER.*\n/g, "")
  //     .replace(/\$\$/g, ";")
  //     .replace(/;;\n/g, ";")
  //     .replace(/\/\*.*?\*\//gs, "")
  //     .replace(/--.*\n/g, "\n");

  //   connection.query(sql, (err, results) => {
  //     if (err) {
  //       console.error("Error initializing database schema:", err);
  //       return;
  //     }
  //     console.log("Database schema initialized successfully");
  //   });
  // } catch (err) {
  //   console.error("Error reading SQL file:", err);
  // }
});

module.exports = connection;
