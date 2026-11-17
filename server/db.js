import { DatabaseSync } from 'node:sqlite';

let db = null;
let requestHistory = [];

export function getDb() {
  if (!db) {
    initDb();
  }
  return db;
}

export function initDb() {
  db = new DatabaseSync(':memory:');

  // 1. Users Table
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      balance REAL DEFAULT 0,
      is_admin INTEGER DEFAULT 0
    );
  `);

  // 2. Employees Table (fictional)
  db.exec(`
    CREATE TABLE employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      salary REAL NOT NULL,
      contact_email TEXT NOT NULL
    );
  `);

  // 3. Students Table (fictional)
  db.exec(`
    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      major TEXT NOT NULL,
      gpa REAL NOT NULL,
      academic_standing TEXT NOT NULL
    );
  `);

  // 4. Products Table (fictional)
  db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL,
      item_name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock_qty INTEGER NOT NULL
    );
  `);

  // Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, full_name, email, role, balance, is_admin)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run('admin', 'Admin@Pass2026!', 'Administrator (Faculty Demo)', 'admin@acme-portal.local', 'SuperAdmin', 85400.00, 1);
  insertUser.run('alice_j', 'Alice#Secure99', 'Alice Jenkins', 'alice@acme-portal.local', 'Financial Analyst', 14250.50, 0);
  insertUser.run('bob_m', 'BobM$7788', 'Bob Martinez', 'bob@acme-portal.local', 'Security Auditor', 22100.00, 0);
  insertUser.run('student_demo', 'StudentPass123', 'John Doe (Demo Student)', 'john@university.local', 'Student', 500.00, 0);

  // Seed Employees
  const insertEmp = db.prepare(`
    INSERT INTO employees (emp_code, full_name, department, designation, salary, contact_email)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertEmp.run('EMP-101', 'Dr. Sarah Connor', 'Cybersecurity', 'Lead Researcher', 125000, 's.connor@acme.local');
  insertEmp.run('EMP-102', 'Miles Dyson', 'AI & Infrastructure', 'Principal Architect', 140000, 'm.dyson@acme.local');
  insertEmp.run('EMP-103', 'John Connor', 'Information Systems', 'Security Engineer', 95000, 'j.connor@acme.local');
  insertEmp.run('EMP-104', 'Kate Brewster', 'Database Administration', 'Senior DBA', 110000, 'k.brewster@acme.local');

  // Seed Students
  const insertStudent = db.prepare(`
    INSERT INTO students (student_id, full_name, major, gpa, academic_standing)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertStudent.run('STU-9001', 'Aarav Sharma', 'Computer Science & Cybersecurity', 3.92, 'Dean''s List');
  insertStudent.run('STU-9002', 'Priya Patel', 'Information Security', 3.85, 'Dean''s List');
  insertStudent.run('STU-9003', 'Rohan Gupta', 'Software Engineering', 3.45, 'Good Standing');
  insertStudent.run('STU-9004', 'Sneha Reddy', 'Data Science & Privacy', 3.78, 'Honors');

  // Seed Products
  const insertProd = db.prepare(`
    INSERT INTO products (sku, item_name, category, price, stock_qty)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertProd.run('HW-TOKEN-01', 'Hardware Security Key (FIDO2/U2F)', 'Hardware', 45.00, 150);
  insertProd.run('SW-WAF-02', 'Cloud WAF Enterprise License (1yr)', 'Software', 1200.00, 25);
  insertProd.run('CR-HSM-03', 'PCIe Hardware Security Module (HSM)', 'Hardware', 4500.00, 8);
  insertProd.run('TR-CERT-04', 'Certified Secure Developer Training', 'Service', 299.00, 500);

  return db;
}

export function resetDb() {
  requestHistory = [];
  return initDb();
}

export function addHistory(entry) {
  requestHistory.unshift({
    id: Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toLocaleTimeString(),
    ...entry
  });
  if (requestHistory.length > 25) {
    requestHistory = requestHistory.slice(0, 25);
  }
}

export function getHistory() {
  return requestHistory;
}
