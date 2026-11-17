# SQL Injection Attack, Exploit & Defend Simulator
**B.Tech Cryptography and Information Security Assignment**  
*Interactive Web-based Educational Demonstration Laboratory*

---

## 🌟 1. Project Overview

This laboratory simulator provides a real-time, browser-based demonstration of **SQL Injection (CWE-89 / OWASP Top 10 A03:2021)** mechanics and its primary mitigation: **Prepared Statements (Parameterized Queries)**.

Designed specifically for live presentation before academic faculty, the entire application operates seamlessly on desktop screens with a synchronized **3-Panel Main Workspace**:

1. **LEFT PANEL – Mission Guide:** A guided 10-step curriculum (Reconnaissance $\to$ Guessing $\to$ Normal Authentication $\to$ Auth Bypass $\to$ Boolean Tautology $\to$ UNION Leaks $\to$ Error-based Leaks $\to$ Blind Inference $\to$ Secure Defense $\to$ Quiz). Features one-click auto-fill chips and active progress tracking.
2. **CENTER PANEL – Target Login Portal:** A realistic corporate portal (*SecureBank Portal*) equipped with an interactive **Vulnerable / Secure Defense Mode switch**, dynamic attack detection tags, quick-fill payload chips, and authorized session dashboard.
3. **RIGHT PANEL – Backend Live View:** Real-time visibility into the backend process:
   - Received JSON payload and HTTP endpoint
   - Executed SQL statement with **attacker-injected fragments highlighted in red/amber** (Vulnerable mode) or pre-compiled query templates with strict **`?` parameter binding** (Secure mode)
   - Plain-English SQL parser logic breakdown
   - Returned database rows table
   - Animated execution timeline ($Input \to App \to Query \to Database \to Output$)
   - Scrollable history log of the last 10 requests

---

## 🚀 2. Quick Start & Execution

The project requires **no external dependencies or backend database servers** to run. You can open and demonstrate it immediately:

### Option A: Direct Browser Launch (Fastest & Zero Setup)
Simply open the `index.html` file in any modern web browser (Google Chrome, Microsoft Edge, Brave, Firefox):
- Double click [index.html](file:///c:/Users/MAYANK/MAYDAY_THINGS/MAY%20PROJECTS/SQL-Injection-Lab/index.html) in Windows File Explorer.
- Or right-click $\to$ *Open with* $\to$ *Google Chrome*.

### Option B: Local Static Server (Optional)
If you prefer running via a local HTTP server:
```bash
# Using Node's npx serve
npx serve .

# Or using Python 3
python -m http.server 3000
```
Then navigate to `http://localhost:3000` in your browser.

---

## 🏗️ 3. Architecture & File Structure

```
SQL-Injection-Lab/
├── index.html       # Single-page UI with Tailwind styling and Lucide icons
├── app.js           # Full client-side simulation engine, SQL parser & stepper
├── styles.css       # Custom syntax highlighting, keyframe pulses & typography
├── package.json     # Optional project metadata
└── README.md        # Academic report, architecture & faculty demo script
```

---

## 🗄️ 4. Simulated Database Schema & Seed Data

The simulation runs an isolated, in-memory relational dataset simulating a corporate system:

### 1. `users` Table (Authentication Gateway)
| Column | Type | Description | Sample Record |
|---|---|---|---|
| `id` | INTEGER PRIMARY KEY | User ID | `1` |
| `username` | TEXT UNIQUE | Login username | `admin` |
| `password` | TEXT | Account password | `Admin@Pass2026!` |
| `full_name` | TEXT | Legal user name | `Administrator (Faculty Demo)` |
| `email` | TEXT | Corporate contact | `admin@acme-portal.local` |
| `role` | TEXT | Privilege level | `SuperAdmin` |
| `balance` | REAL | Account treasury | `$85,400.00` |
| `is_admin` | INTEGER | Administrative bit | `1` |

### 2. `employees` Table (Confidential Department Data)
*Targeted during UNION-based data extraction attacks.*
- Fields: `id`, `emp_code` (e.g. `EMP-101`), `full_name`, `department`, `designation`, `salary`, `contact_email`.

### 3. `students` Table (Academic Records)
- Fields: `id`, `student_id` (e.g. `STU-9001`), `full_name`, `major`, `gpa`, `academic_standing`.

### 4. `products` Table (Inventory & Hardware)
- Fields: `id`, `sku`, `item_name`, `category`, `price`, `stock_qty`.

---

## ⚡ 5. Attack Payloads & Explanations

| Attack Type | Injected Payload | How It Works & Vulnerability Mechanics |
|---|---|---|
| **Authentication Bypass** | `admin' --` | The single quote terminates the `'admin'` string. The `--` SQL sequence marks the remainder of the query as a comment, entirely omitting `AND password = '...'`. |
| **Boolean Tautology** | `' OR 1=1 --` | Injects an `OR` condition that is always true. `False OR True` evaluates to `True`, forcing the query to return every row in the table. The web app logs in the first returned user (`admin`). |
| **UNION-Based Leak** | `' UNION SELECT id, emp_code, salary, contact_email FROM employees --` | Utilizes the `UNION` operator to append confidential employee salary records into the output stream of the original login query. |
| **Error-Based Leak** | `' AND 1=CONVERT(int, (SELECT @@version)) --` | Forces the database to convert database metadata or system versions into an incompatible integer, triggering a verbose database error message disclosing internal structure. |
| **Blind (Boolean) SQLi** | `' OR (SELECT SUBSTR(username,1,1) FROM users WHERE id=1)='a' --` | Sends iterative true/false propositions. The application response (Login success vs failure) reveals characters one-by-one. |

---

## 🛡️ 6. How Prepared Statements Defend Against SQLi

### The Flaw (String Concatenation):
```javascript
// DANGEROUS: User input alters query grammar
const sql = "SELECT * FROM users WHERE username = '" + userInput + "'";
```
The database SQL parser receives both the command keywords and user data in a single string. When user data contains metacharacters (`'`, `--`, `OR`), the parser re-structures the Abstract Syntax Tree (AST).

### The Fix (Prepared Statements / Parameterization):
```javascript
// SECURE: Strict separation of Code and Data
const stmt = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?");
stmt.get(userInput, passInput);
```
1. **Compilation Phase:** The SQL command structure is compiled and optimized by the database engine *first* with `?` placeholders.
2. **Execution Phase:** Untrusted user input is transmitted over a distinct parameter channel strictly as an **inert literal value**.
3. **Neutralization:** The string `' OR 1=1 --` is evaluated as the literal username string. Because no user is registered with that exact name, `0 rows` are returned and the attack is neutralized with zero risk.

---

## 🎓 7. Faculty Live Demonstration Script (Step-by-Step)

Follow this sequence during your live viva / presentation to impress faculty:

1. **Orientation (30 Seconds):**
   - Show the **3-Panel Layout**: Explain that the **Left Panel** guides the auditor, the **Center Panel** simulates the victim login page, and the **Right Panel** reveals the backend server memory in real-time.
2. **Normal Authentication Baseline:**
   - Click the chip `admin / Admin@Pass2026!` and click **Sign In**.
   - Show the Right Panel: 1 row returned, green banner, legitimate session created.
3. **Offensive Demonstration 1 (Comment Bypass):**
   - Click the chip `admin' --` (leaving password blank).
   - Click **Sign In**.
   - Point to the Right Panel: The executed SQL highlights `admin' --` in red, and the logic breakdown explains that `--` commented out the password verification.
4. **Offensive Demonstration 2 (OR 1=1 Tautology):**
   - Click `' OR 1=1 --` and click **Sign In**.
   - Point out that the query returned all records and granted administrator access.
5. **Defensive Demonstration (Secure Mode):**
   - Toggle the defense switch at the top of the Center Panel to **Secure Mode** (green badge).
   - Re-submit `' OR 1=1 --`.
   - Show the faculty the Right Panel: The query shows `?` placeholders. The input is safely isolated in `Bound Parameters`. Result: **ATTACK BLOCKED** (0 rows).
6. **Secondary Modules Walkthrough:**
   - Click **Compare** to show side-by-side simultaneous execution of vulnerable vs secure backends.
   - Click **Learn** to demonstrate the interactive data flow diagram and attack classifications.
   - Click **Quiz** to demonstrate the interactive 8-question evaluation.
   - Or click **Auto Demo** button for an automated hands-free walkthrough.

---

## 📚 8. References & OWASP Standards

- **OWASP Top 10:2021 – A03: Injection** ([owasp.org/Top10/A03_2021-Injection](https://owasp.org/Top10/A03_2021-Injection/))
- **OWASP SQL Injection Prevention Cheat Sheet** ([cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html))
- **CWE-89: Improper Neutralization of Special Elements used in an SQL Command** ([cwe.mitre.org/data/definitions/89.html](https://cwe.mitre.org/data/definitions/89.html))
- **NIST SP 800-53 Rev. 5:** SI-10 (Information Input Validation)
