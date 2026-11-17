/**
 * SQL Injection Lab - Simulation Engine
 * Author: Antigravity Agent
 * B.Tech Cryptography & Information Security Project
 */

// ==========================================
// 1. MOCK DATABASE & REPOSITORY
// ==========================================
const INITIAL_DB = {
  users: [
    { id: 1, username: 'admin', password: 'Admin@Pass2026!', full_name: 'Administrator (Faculty Demo)', email: 'admin@acme-portal.local', role: 'SuperAdmin', balance: '$85,400.00', is_admin: 1 },
    { id: 2, username: 'alice_j', password: 'Alice#Secure99', full_name: 'Alice Jenkins', email: 'alice@acme-portal.local', role: 'Financial Analyst', balance: '$14,250.50', is_admin: 0 },
    { id: 3, username: 'bob_m', password: 'BobM$7788', full_name: 'Bob Martinez', email: 'bob@acme-portal.local', role: 'Security Auditor', balance: '$22,100.00', is_admin: 0 },
    { id: 4, username: 'student_demo', password: 'StudentPass123', full_name: 'John Doe (Demo Student)', email: 'john@university.local', role: 'Student', balance: '$500.00', is_admin: 0 }
  ],
  employees: [
    { id: 101, emp_code: 'EMP-101', full_name: 'Dr. Sarah Connor', department: 'Cybersecurity', designation: 'Lead Researcher', salary: '$125,000.00', contact_email: 's.connor@acme.local' },
    { id: 102, emp_code: 'EMP-102', full_name: 'Miles Dyson', department: 'AI & Infrastructure', designation: 'Principal Architect', salary: '$140,000.00', contact_email: 'm.dyson@acme.local' },
    { id: 103, emp_code: 'EMP-103', full_name: 'John Connor', department: 'Information Systems', designation: 'Security Engineer', salary: '$95,000.00', contact_email: 'j.connor@acme.local' },
    { id: 104, emp_code: 'EMP-104', full_name: 'Kate Brewster', department: 'Database Admin', designation: 'Senior DBA', salary: '$110,000.00', contact_email: 'k.brewster@acme.local' }
  ],
  students: [
    { id: 901, student_id: 'STU-9001', full_name: 'Aarav Sharma', major: 'Computer Science & Security', gpa: 3.92, academic_standing: "Dean's List" },
    { id: 902, student_id: 'STU-9002', full_name: 'Priya Patel', major: 'Information Security', gpa: 3.85, academic_standing: "Dean's List" },
    { id: 903, student_id: 'STU-9003', full_name: 'Rohan Gupta', major: 'Software Engineering', gpa: 3.45, academic_standing: 'Good Standing' },
    { id: 904, student_id: 'STU-9004', full_name: 'Sneha Reddy', major: 'Data Science & Privacy', gpa: 3.78, academic_standing: 'Honors' }
  ],
  products: [
    { id: 1, sku: 'HW-KEY-01', item_name: 'Hardware Security Key (FIDO2)', category: 'Hardware', price: '$45.00', stock_qty: 150 },
    { id: 2, sku: 'SW-WAF-02', item_name: 'Cloud WAF Enterprise (1yr)', category: 'Software', price: '$1,200.00', stock_qty: 25 },
    { id: 3, sku: 'CR-HSM-03', item_name: 'PCIe Hardware Security Module', category: 'Hardware', price: '$4,500.00', stock_qty: 8 },
    { id: 4, sku: 'TR-CERT-04', item_name: 'Certified Secure Developer', category: 'Training', price: '$299.00', stock_qty: 500 }
  ]
};

let currentDb = JSON.parse(JSON.stringify(INITIAL_DB));
let currentMode = 'vulnerable'; // 'vulnerable' or 'secure'
let requestHistory = [];
let currentMissionStep = 0;
let autoDemoActive = false;

// ==========================================
// 2. MISSION GUIDE SPECIFICATION
// ==========================================
const MISSION_STEPS = [
  {
    title: '1. Meet the Target',
    instruction: 'Welcome to SecureBank Portal. Your goal as an auditor is to gain administrative access without possessing the password.',
    why: 'Demonstrates how unvalidated user inputs can manipulate backend SQL semantics.',
    chipLabel: null,
    chipUser: '',
    chipPass: '',
    checkDone: () => true
  },
  {
    title: '2. Try Guessing Credentials',
    instruction: 'Simulate a traditional brute-force or credential guessing attempt by entering standard combinations.',
    why: 'Legitimate authentication correctly rejects incorrect passwords with 0 rows returned.',
    chipLabel: 'admin / wrongpass',
    chipUser: 'admin',
    chipPass: 'wrongpass',
    checkDone: (res, u, p) => u === 'admin' && res && !res.success && !res.injected
  },
  {
    title: '3. Log In Normally',
    instruction: 'Authenticate using legitimate valid credentials to observe standard system behavior.',
    why: 'Provides a baseline: exactly one valid user row is returned from database matching both fields.',
    chipLabel: 'admin / Admin@Pass2026!',
    chipUser: 'admin',
    chipPass: 'Admin@Pass2026!',
    checkDone: (res, u, p) => res && res.success && !res.injected
  },
  {
    title: '4. First Injection: Auth Bypass',
    instruction: 'Inject a comment sequence (`--`) to neutralize the password verification logic completely.',
    why: 'The comment marker truncates everything after the username, so password checking is never evaluated!',
    chipLabel: `admin' --`,
    chipUser: `admin' --`,
    chipPass: '',
    checkDone: (res, u, p) => res && res.success && res.injected && (u.includes('--') || u.includes('#'))
  },
  {
    title: '5. OR-based Injection',
    instruction: 'Input a tautology condition (`OR 1=1`) that forces the WHERE clause to always evaluate to TRUE.',
    why: 'Modifies boolean algebra in SQL: `False OR True` evaluates to `True`, selecting rows unconditionally.',
    chipLabel: `' OR 1=1 --`,
    chipUser: `' OR 1=1 --`,
    chipPass: '',
    checkDone: (res, u, p) => res && res.success && (u.includes('OR 1=1') || u.includes("OR '1'='1"))
  },
  {
    title: '6. UNION-based Data Leak',
    instruction: 'Inject a UNION SELECT payload to extract hidden data from the confidential employees table.',
    why: 'UNION concatenates the results of two queries into one result set, leaking unauthorized tables.',
    chipLabel: `UNION Employees`,
    chipUser: `' UNION SELECT id, emp_code, salary, contact_email FROM employees --`,
    chipPass: '',
    checkDone: (res, u, p) => u.toLowerCase().includes('union')
  },
  {
    title: '7. Error-based Injection',
    instruction: 'Induce deliberate database errors (like type conversion or divide-by-zero) to reveal system internals.',
    why: 'Detailed error messages leak database vendor, schema names, or table definitions to the attacker.',
    chipLabel: `Coerce Error`,
    chipUser: `' AND 1=CONVERT(int, (SELECT @@version)) --`,
    chipPass: '',
    checkDone: (res, u, p) => res && res.error
  },
  {
    title: '8. Blind Boolean Inference',
    instruction: 'Test a conditional statement. Observe whether login behaves differently when a condition is TRUE vs FALSE.',
    why: 'Even when database outputs are not rendered on screen, boolean timing or responses infer data byte-by-byte.',
    chipLabel: `Blind Check`,
    chipUser: `' OR (SELECT SUBSTR(username,1,1) FROM users WHERE id=1) = 'a' --`,
    chipPass: '',
    checkDone: (res, u, p) => u.toLowerCase().includes('substr') || u.toLowerCase().includes('length')
  },
  {
    title: '9. Defend It: Secure Mode',
    instruction: 'Switch Defense Mode to "Secure" at the top and re-run your injection payloads.',
    why: 'Prepared statements treat user input strictly as literal string values, neutralizing all syntax attacks.',
    chipLabel: `Test Attack on Secure`,
    chipUser: `' OR 1=1 --`,
    chipPass: '',
    checkDone: (res, u, p) => currentMode === 'secure' && res && !res.success && res.blocked
  },
  {
    title: '10. Mission Complete!',
    instruction: 'Congratulations! You have demonstrated the mechanics, risks, and proper remediation of SQL Injection.',
    why: 'Test your knowledge now in the Quiz module or review Prepared Statement internals.',
    chipLabel: null,
    chipUser: '',
    chipPass: '',
    checkDone: () => true
  }
];

// Mini Educational Cards per step
const STEP_DETAILS = [
  {
    what: 'Introduction to SQLi targets',
    example: 'Normal credentials or syntax probing',
    impact: 'Reconnaissance phase of penetration testing',
    defense: 'Enforce parameterized queries across all database access layers'
  },
  {
    what: 'Authentication Verification Logic',
    example: 'SELECT * FROM users WHERE username = "admin" AND password = "wrong"',
    impact: 'Application performs cryptographic comparison or DB match',
    defense: 'Constant-time comparison and rate-limiting'
  },
  {
    what: 'Legitimate Authentication Baseline',
    example: 'SELECT * FROM users WHERE username = "admin" AND password = "..."',
    impact: 'Authorized session token granted',
    defense: 'Multi-factor authentication (MFA) & secure session cookies'
  },
  {
    what: 'SQL Comment Truncation (`--`, `/*`, `#`)',
    example: `username: admin' --`,
    impact: 'Authentication bypass without knowing the password',
    defense: 'Prepared Statements (Pre-compiled query template)'
  },
  {
    what: 'Boolean Tautology Exploitation',
    example: `' OR '1'='1' or ' OR 1=1 --`,
    impact: 'Returns entire user database, typically logging in as first user (Admin)',
    defense: 'Pre-compilation separates query structure from data values'
  },
  {
    what: 'UNION Query Injection (CWE-89)',
    example: `' UNION SELECT id, emp_code, salary, contact_email FROM employees --`,
    impact: 'Exfiltration of unauthorized tables, SSNs, credit cards, or passwords',
    defense: 'Prepared statements & Principle of Least Privilege for DB user'
  },
  {
    what: 'Verbose Error-Based Information Leakage',
    example: `' AND 1=CONVERT(int, (SELECT @@version)) --`,
    impact: 'Server error disclosures leak database engine, versions, and schema names',
    defense: 'Generic error messages in production & input sanitization'
  },
  {
    what: 'Blind (Inferential) SQL Injection',
    example: `' OR (SELECT SUBSTR(username,1,1) FROM users WHERE id=1) = 'a' --`,
    impact: 'Exfiltrates entire databases character-by-character via binary search',
    defense: 'Complete parameterization of all WHERE clauses'
  },
  {
    what: 'Prepared Statements & Parameter Binding',
    example: `db.prepare('SELECT * FROM users WHERE user = ? AND pass = ?')`,
    impact: 'Attack payload is treated strictly as an inert string literal. Zero syntax manipulation.',
    defense: 'Industry standard mitigation recommended by OWASP'
  },
  {
    what: 'Lab Assessment & Summary',
    example: 'Proceed to Quiz module for knowledge check',
    impact: 'Understand both exploitation and defense patterns for viva/interview',
    defense: 'Defense-in-depth: WAF, least privilege, parameterization, code review'
  }
];

// ==========================================
// 3. INITIALIZATION & LUCIDE ICONS
// ==========================================
function initApp() {
  try {
    renderMissionGuide();
    updateRightPanelEmpty();
    renderImpactTable('users');
    renderQuiz();
    refreshIcons();
  } catch (err) {
    console.error('Initialization error in SQL Injection Lab:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.addEventListener('load', () => {
  refreshIcons();
});

function refreshIcons() {
  try {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  } catch (e) {
    console.warn('Lucide icons error:', e);
  }
}

// ==========================================
// 4. TAB NAVIGATION
// ==========================================
function switchTab(tabId) {
  const tabs = ['lab', 'learn', 'compare', 'impact', 'quiz'];
  
  tabs.forEach(t => {
    const moduleEl = document.getElementById(`module-${t}`);
    const tabBtn = document.getElementById(`tab-btn-${t}`);
    
    if (t === tabId) {
      if (moduleEl) moduleEl.classList.remove('hidden');
      if (tabBtn) {
        tabBtn.className = 'nav-tab px-3 py-2 text-sm font-semibold rounded-lg text-blue-600 bg-blue-50 transition-all flex items-center space-x-1.5';
      }
    } else {
      if (moduleEl) moduleEl.classList.add('hidden');
      if (tabBtn) {
        tabBtn.className = 'nav-tab px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center space-x-1.5';
      }
    }
  });

  if (tabId === 'compare') {
    runComparisonTest();
  }
  refreshIcons();
}

// ==========================================
// 5. MODE SWITCHER (VULNERABLE / SECURE)
// ==========================================
function setLabMode(mode) {
  currentMode = mode;
  const btnVuln = document.getElementById('btn-mode-vuln');
  const btnSec = document.getElementById('btn-mode-sec');
  const endpointEl = document.getElementById('request-endpoint');
  const queryIndicator = document.getElementById('query-mode-indicator');

  if (mode === 'vulnerable') {
    btnVuln.className = 'px-3 py-1 text-xs font-bold rounded-md bg-red-600 text-white shadow-sm transition-all flex items-center space-x-1';
    btnSec.className = 'px-3 py-1 text-xs font-bold rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center space-x-1';
    endpointEl.textContent = 'POST /api/vulnerable/login';
    queryIndicator.textContent = 'CONCATENATION';
    queryIndicator.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700';
  } else {
    btnSec.className = 'px-3 py-1 text-xs font-bold rounded-md bg-emerald-600 text-white shadow-sm transition-all flex items-center space-x-1';
    btnVuln.className = 'px-3 py-1 text-xs font-bold rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center space-x-1';
    endpointEl.textContent = 'POST /api/secure/login';
    queryIndicator.textContent = 'PARAMETERIZED (?)';
    queryIndicator.className = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700';
  }
  refreshIcons();
}

// ==========================================
// 6. MISSION GUIDE LOGIC & RENDERING
// ==========================================
function renderMissionGuide() {
  const container = document.getElementById('stepper-container');
  const progressLabel = document.getElementById('mission-progress-label');
  const progressBar = document.getElementById('mission-progress-bar');
  const cardContainer = document.getElementById('mission-active-card');

  if (!container) return;

  progressLabel.textContent = `Step ${currentMissionStep + 1} of ${MISSION_STEPS.length}`;
  const pct = Math.round(((currentMissionStep + 1) / MISSION_STEPS.length) * 100);
  progressBar.style.width = `${pct}%`;

  container.innerHTML = MISSION_STEPS.map((step, idx) => {
    let statusClass = 'border-slate-200 bg-white text-slate-600';
    let icon = `<span class="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">${idx + 1}</span>`;
    
    if (idx < currentMissionStep) {
      statusClass = 'border-emerald-200 bg-emerald-50/50 text-slate-800';
      icon = `<span class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold"><i data-lucide="check" class="w-3 h-3"></i></span>`;
    } else if (idx === currentMissionStep) {
      statusClass = 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-400';
      icon = `<span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold animate-pulse">${idx + 1}</span>`;
    }

    return `
      <div onclick="jumpToMissionStep(${idx})" class="p-3 rounded-xl border ${statusClass} cursor-pointer transition-all hover:bg-slate-50">
        <div class="flex items-start space-x-2.5">
          <div class="pt-0.5">${icon}</div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-xs truncate">${step.title}</h4>
              ${idx === currentMissionStep ? '<span class="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded">Active</span>' : ''}
              ${idx < currentMissionStep ? '<span class="text-[9px] font-semibold text-emerald-600">Done</span>' : ''}
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">${step.instruction}</p>
            ${step.chipLabel && idx === currentMissionStep ? `
              <div class="mt-2">
                <button onclick="event.stopPropagation(); fillForm('${escapeQuotes(step.chipUser)}', '${escapeQuotes(step.chipPass)}')" class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 shadow-xs transition-colors">
                  <i data-lucide="corner-down-right" class="w-3 h-3"></i>
                  <span>Try: ${step.chipLabel}</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Active Mini Card
  const details = STEP_DETAILS[currentMissionStep];
  cardContainer.innerHTML = `
    <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
      <span class="font-bold text-slate-800 flex items-center space-x-1">
        <i data-lucide="lightbulb" class="w-3.5 h-3.5 text-amber-500"></i>
        <span>Step Technical Insight</span>
      </span>
      <span class="text-[10px] text-slate-400 font-mono">CWE-89</span>
    </div>
    <div class="space-y-1.5 pt-1">
      <div><span class="font-semibold text-slate-600">Concept:</span> <span class="text-slate-800">${details.what}</span></div>
      <div><span class="font-semibold text-slate-600">Security Risk:</span> <span class="text-red-700">${details.impact}</span></div>
      <div><span class="font-semibold text-slate-600">Remediation:</span> <span class="text-emerald-700">${details.defense}</span></div>
    </div>
  `;

  refreshIcons();
}

function jumpToMissionStep(idx) {
  currentMissionStep = idx;
  renderMissionGuide();
}

function skipMissionStep() {
  if (currentMissionStep < MISSION_STEPS.length - 1) {
    currentMissionStep++;
    renderMissionGuide();
  }
}

function resetMission() {
  currentMissionStep = 0;
  renderMissionGuide();
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ==========================================
// 7. TARGET LOGIN FORM HANDLING
// ==========================================
function fillForm(user, pass) {
  document.getElementById('target-username').value = user;
  document.getElementById('target-password').value = pass;
  
  // Real-time detection badge
  checkInputPayload(user);
}

function clearLoginForm() {
  document.getElementById('target-username').value = '';
  const passInput = document.getElementById('target-password');
  passInput.value = '';
  passInput.type = 'password';
  const eyeIcon = document.getElementById('password-eye-icon');
  if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye');
  document.getElementById('input-alert-tag').classList.add('hidden');
  document.getElementById('login-result-banner').classList.add('hidden');
  document.getElementById('logged-user-card').classList.add('hidden');
  refreshIcons();
}

function togglePasswordVisibility() {
  const passInput = document.getElementById('target-password');
  const eyeIcon = document.getElementById('password-eye-icon');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    eyeIcon.setAttribute('data-lucide', 'eye-off');
  } else {
    passInput.type = 'password';
    eyeIcon.setAttribute('data-lucide', 'eye');
  }
  refreshIcons();
}

document.getElementById('target-username')?.addEventListener('input', (e) => {
  checkInputPayload(e.target.value);
});

function checkInputPayload(val) {
  const alertTag = document.getElementById('input-alert-tag');
  const isSuspicious = /('|"|--|#|\/\*|union|select|or\s+1=1|or\s+'1'='1)/i.test(val);
  if (isSuspicious) {
    alertTag.classList.remove('hidden');
  } else {
    alertTag.classList.add('hidden');
  }
}

// ==========================================
// 8. SIMULATION EXECUTION ENGINE
// ==========================================
function handleTargetLogin(e) {
  e.preventDefault();
  const username = document.getElementById('target-username').value;
  const password = document.getElementById('target-password').value;

  // Run execution timeline animation
  animateTimeline();

  // Evaluate query based on mode
  const result = executeSqlSimulation(username, password, currentMode);

  // Update Center Panel UI
  renderLoginResult(result);

  // Update Right Panel UI
  renderBackendLiveView(username, password, result, currentMode);

  // Check mission progress
  const curStep = MISSION_STEPS[currentMissionStep];
  if (curStep && curStep.checkDone(result, username, password)) {
    if (currentMissionStep < MISSION_STEPS.length - 1) {
      setTimeout(() => {
        currentMissionStep++;
        renderMissionGuide();
        if (currentMissionStep === MISSION_STEPS.length - 1 && window.confetti) {
          window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }, 900);
    }
  }
}

function executeSqlSimulation(username, password, mode) {
  const u = (username || '').trim();
  const p = (password || '').trim();

  // SECURE MODE: Parameterized Pre-compiled Query
  if (mode === 'secure') {
    const secureTemplate = "SELECT * FROM users WHERE username = ? AND password = ?";
    const isInjectionAttempt = /('|"|--|#|union|select|or)/i.test(u);
    
    // In secure mode, user input is matched literally against database rows
    const userFound = currentDb.users.find(usr => usr.username === u && usr.password === p);

    return {
      mode: 'secure',
      queryTemplate: secureTemplate,
      parameters: [u, p],
      success: !!userFound,
      user: userFound || null,
      rows: userFound ? [userFound] : [],
      injected: false,
      blocked: isInjectionAttempt,
      error: null,
      logicBreakdown: isInjectionAttempt
        ? `🛡️ DEFENSE TRIGGERED: Input '${u}' contains SQL metacharacters, but because a PREPARED STATEMENT is used with placeholders (?), the entire input was treated strictly as inert string data. The database searched for a literal username '${u}' and found 0 matches.`
        : `Normal parameterized execution: Input bound as inert data parameters. Matches found: ${userFound ? 1 : 0}.`
    };
  }

  // VULNERABLE MODE: String Concatenation Simulation
  const rawSql = `SELECT * FROM users WHERE username = '${u}' AND password = '${p}'`;

  // 1. Error-based detection
  if (u.includes('@@version') || u.includes('CONVERT') || u.includes('1/0') || (u.endsWith("'") && !u.includes("--"))) {
    return {
      mode: 'vulnerable',
      rawSql: rawSql,
      injectedText: u,
      success: false,
      user: null,
      rows: [],
      injected: true,
      error: u.includes('1/0') 
        ? "SQLite/DB Error: Division by zero encountered in expression."
        : "SQLite syntax error: unclosed quotation mark or conversion failure near 'CONVERT(int, @@version)'",
      logicBreakdown: "⚠️ ERROR DISCLOSURE: Syntactical or type error generated by injected fragment. In real databases, detailed error messages disclose schema details to attackers."
    };
  }

  // 2. UNION-based injection
  if (/union\s+select/i.test(u)) {
    // Fictional UNION leak from employees or students
    let leakedRows = [];
    if (u.toLowerCase().includes('employee')) {
      leakedRows = currentDb.employees.map(e => ({
        id: e.id,
        username: e.emp_code,
        full_name: e.full_name,
        role: e.designation,
        balance: e.salary
      }));
    } else {
      leakedRows = currentDb.students.map(s => ({
        id: s.id,
        username: s.student_id,
        full_name: s.full_name,
        role: s.major,
        balance: `GPA: ${s.gpa}`
      }));
    }

    return {
      mode: 'vulnerable',
      rawSql: rawSql,
      injectedText: u,
      success: true,
      user: leakedRows[0],
      rows: leakedRows,
      injected: true,
      error: null,
      logicBreakdown: "📦 UNION INJECTION: The attacker's UNION operator combined results from the primary query with unauthorized records from another table."
    };
  }

  // 3. Auth Bypass with Comment (admin' --)
  if (u.startsWith("admin'") && (u.includes('--') || u.includes('#') || u.includes('/*'))) {
    const adminUser = currentDb.users[0];
    return {
      mode: 'vulnerable',
      rawSql: rawSql,
      injectedText: u,
      success: true,
      user: adminUser,
      rows: [adminUser],
      injected: true,
      error: null,
      logicBreakdown: "⚡ AUTH BYPASS: The comment syntax (`--`) truncated the password check (`AND password = '...'`). The query became `WHERE username = 'admin'`, granting instant administrative login without a password!"
    };
  }

  // 4. Boolean Tautology (OR 1=1 or OR '1'='1')
  if (/or\s+['"]?1['"]?\s*=\s*['"]?1/i.test(u) || /or\s+true/i.test(u) || /or\s+'a'='a'/i.test(u)) {
    const adminUser = currentDb.users[0];
    return {
      mode: 'vulnerable',
      rawSql: rawSql,
      injectedText: u,
      success: true,
      user: adminUser,
      rows: currentDb.users, // returns all users
      injected: true,
      error: null,
      logicBreakdown: "⚡ TAUTOLOGY BYPASS: Condition evaluates to `WHERE ... OR 1=1` which is ALWAYS TRUE. Database returns all rows; the application logs in the first record found (Admin)!"
    };
  }

  // 5. Blind Boolean check
  if (u.toLowerCase().includes('substr') || u.toLowerCase().includes('length')) {
    const isTrue = u.includes("'a'") || u.includes("'A'") || u.includes("= 5");
    return {
      mode: 'vulnerable',
      rawSql: rawSql,
      injectedText: u,
      success: isTrue,
      user: isTrue ? currentDb.users[0] : null,
      rows: isTrue ? [currentDb.users[0]] : [],
      injected: true,
      error: null,
      logicBreakdown: isTrue
        ? "👁️ BLIND SQLi (TRUE Condition): The sub-query expression evaluated to TRUE, so the query returned a valid session."
        : "👁️ BLIND SQLi (FALSE Condition): The sub-query expression evaluated to FALSE, so the query returned 0 rows. Attacker learns character mismatches."
    };
  }

  // 6. Normal Valid Login
  const validUser = currentDb.users.find(usr => usr.username === u && usr.password === p);
  if (validUser) {
    return {
      mode: 'vulnerable',
      rawSql: rawSql,
      injectedText: null,
      success: true,
      user: validUser,
      rows: [validUser],
      injected: false,
      error: null,
      logicBreakdown: "Normal legitimate login. Both username and password matched a single record in the users table."
    };
  }

  // 7. Failed Login (Wrong credentials)
  return {
    mode: 'vulnerable',
    rawSql: rawSql,
    injectedText: null,
    success: false,
    user: null,
    rows: [],
    injected: false,
    error: null,
    logicBreakdown: "Invalid credentials. Condition evaluated to FALSE; 0 rows returned."
  };
}

// ==========================================
// 9. CENTER PANEL RENDERING
// ==========================================
function renderLoginResult(res) {
  const banner = document.getElementById('login-result-banner');
  const userCard = document.getElementById('logged-user-card');

  banner.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-800', 'border-emerald-200', 'bg-red-50', 'text-red-800', 'border-red-200', 'bg-amber-50', 'text-amber-800', 'border-amber-200');

  if (res.error) {
    banner.className = 'rounded-xl p-3.5 text-xs font-medium border bg-amber-50 text-amber-900 border-amber-300 space-y-1';
    banner.innerHTML = `
      <div class="flex items-center space-x-1.5 font-bold">
        <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600"></i>
        <span>DATABASE ERROR DISCLOSED (Error-based SQLi)</span>
      </div>
      <p class="font-mono text-[11px] bg-white p-2 rounded border border-amber-200">${res.error}</p>
    `;
    userCard.classList.add('hidden');
    refreshIcons();
    return;
  }

  if (res.success) {
    if (res.injected) {
      banner.className = 'rounded-xl p-3.5 text-xs font-medium border bg-red-50 text-red-900 border-red-300 space-y-1';
      banner.innerHTML = `
        <div class="flex items-center space-x-1.5 font-bold">
          <i data-lucide="unlock" class="w-4 h-4 text-red-600"></i>
          <span>ATTACK SUCCEEDED: Authentication Bypassed!</span>
        </div>
        <p class="text-[11px] text-red-700">Access granted without supplying a valid password due to unescaped SQL syntax.</p>
      `;
    } else {
      banner.className = 'rounded-xl p-3.5 text-xs font-medium border bg-emerald-50 text-emerald-900 border-emerald-300 space-y-1';
      banner.innerHTML = `
        <div class="flex items-center space-x-1.5 font-bold">
          <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
          <span>Login Successful (Legitimate Session)</span>
        </div>
        <p class="text-[11px] text-emerald-700">Welcome, ${res.user.full_name} (${res.user.role})</p>
      `;
    }

    // Populate user card
    userCard.classList.remove('hidden');
    document.getElementById('card-user-name').textContent = res.user.full_name || res.user.username;
    document.getElementById('card-user-role').textContent = res.user.role || 'User';
    document.getElementById('card-user-email').textContent = res.user.email || res.user.contact_email || 'n/a';
    document.getElementById('card-user-balance').textContent = res.user.balance || '$0.00';
    document.getElementById('card-user-avatar').textContent = (res.user.full_name || res.user.username || 'U')[0].toUpperCase();

  } else {
    userCard.classList.add('hidden');
    if (res.blocked) {
      banner.className = 'rounded-xl p-3.5 text-xs font-medium border bg-emerald-50 text-emerald-900 border-emerald-300 space-y-1';
      banner.innerHTML = `
        <div class="flex items-center space-x-1.5 font-bold">
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
          <span>ATTACK BLOCKED (Secure Mode Active)</span>
        </div>
        <p class="text-[11px] text-emerald-700">Parameterized query prevented SQL injection. Input treated as literal data value.</p>
      `;
    } else {
      banner.className = 'rounded-xl p-3.5 text-xs font-medium border bg-slate-100 text-slate-800 border-slate-300 space-y-1';
      banner.innerHTML = `
        <div class="flex items-center space-x-1.5 font-bold">
          <i data-lucide="x-circle" class="w-4 h-4 text-slate-500"></i>
          <span>Invalid Credentials</span>
        </div>
        <p class="text-[11px] text-slate-600">0 rows returned. Verification failed.</p>
      `;
    }
  }

  refreshIcons();
}

// ==========================================
// 10. RIGHT PANEL RENDERING (BACKEND LIVE VIEW)
// ==========================================
function renderBackendLiveView(username, password, res, mode) {
  // Update Backend Badge
  const badge = document.getElementById('backend-status-badge');
  if (res.error) {
    badge.textContent = '500 ERROR';
    badge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800';
  } else if (res.success && res.injected) {
    badge.textContent = 'VULNERABLE (200)';
    badge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800';
  } else if (res.blocked) {
    badge.textContent = 'SECURED (401)';
    badge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800';
  } else if (res.success) {
    badge.textContent = 'AUTHENTICATED (200)';
    badge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800';
  } else {
    badge.textContent = 'REJECTED (401)';
    badge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700';
  }

  // 1. Request payload JSON
  document.getElementById('req-body-display').textContent = JSON.stringify({
    username: username,
    password: password ? '********' : ''
  }, null, 2);

  // 2. Query Built
  const queryDisplay = document.getElementById('sql-query-display');
  if (mode === 'secure') {
    queryDisplay.innerHTML = `
      <div class="text-slate-400">// Pre-compiled Query Template:</div>
      <div><span class="text-blue-400 font-bold">SELECT</span> * <span class="text-blue-400 font-bold">FROM</span> users <span class="text-blue-400 font-bold">WHERE</span> username = <span class="text-emerald-400 font-bold">?</span> <span class="text-blue-400 font-bold">AND</span> password = <span class="text-emerald-400 font-bold">?</span></div>
      <div class="mt-2 pt-2 border-t border-slate-700 text-[11px] text-slate-300">
        <span class="text-slate-400">Bound Parameters (Strict Data):</span><br>
        param[1] = <span class="text-emerald-300 font-bold">"${escapeHtml(username)}"</span> (string)<br>
        param[2] = <span class="text-emerald-300 font-bold">"${escapeHtml(password)}"</span> (string)
      </div>
    `;
  } else {
    // Highlight injected portion in red/amber
    const injectedPart = res.injectedText ? `<span class="sql-injected">${escapeHtml(res.injectedText)}</span>` : `<span class="text-emerald-400">'${escapeHtml(username)}'</span>`;
    queryDisplay.innerHTML = `
      <div><span class="text-blue-400 font-bold">SELECT</span> * <span class="text-blue-400 font-bold">FROM</span> users <span class="text-blue-400 font-bold">WHERE</span> username = ${injectedPart} <span class="text-blue-400 font-bold">AND</span> password = <span class="text-emerald-400">'${escapeHtml(password)}'</span></div>
    `;
  }

  // 3. Logic Breakdown
  document.getElementById('logic-breakdown-text').innerHTML = res.logicBreakdown;

  // 4. Rows returned table
  const rowCountBadge = document.getElementById('rows-count-badge');
  const tbody = document.getElementById('db-output-tbody');
  
  rowCountBadge.textContent = `${res.rows.length} row(s) returned`;
  if (res.rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 italic">0 rows returned (Empty result)</td></tr>`;
  } else {
    tbody.innerHTML = res.rows.map(r => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="p-1.5 font-mono text-slate-500">${r.id}</td>
        <td class="p-1.5 font-bold text-slate-800">${escapeHtml(r.username || r.full_name)}</td>
        <td class="p-1.5 text-slate-600">${escapeHtml(r.role || r.designation || 'User')}</td>
        <td class="p-1.5 font-mono text-emerald-700 font-semibold">${escapeHtml(r.balance || '$0')}</td>
      </tr>
    `).join('');
  }

  // 5. Add to Request History
  requestHistory.unshift({
    timestamp: new Date().toLocaleTimeString(),
    endpoint: mode === 'secure' ? '/api/secure/login' : '/api/vulnerable/login',
    username: username || '(empty)',
    verdict: res.success ? (res.injected ? 'BYPASS' : 'VALID') : (res.blocked ? 'BLOCKED' : 'FAIL'),
    statusColor: res.success ? (res.injected ? 'text-red-600' : 'text-blue-600') : (res.blocked ? 'text-emerald-600' : 'text-slate-500')
  });

  if (requestHistory.length > 10) requestHistory.pop();
  renderHistoryList();
}

function updateRightPanelEmpty() {
  document.getElementById('req-body-display').textContent = '{ "username": "", "password": "" }';
  document.getElementById('sql-query-display').innerHTML = '<span class="text-slate-500">-- Awaiting input --</span>';
}

function renderHistoryList() {
  const container = document.getElementById('history-container');
  const countEl = document.getElementById('history-count');
  countEl.textContent = `${requestHistory.length} calls`;

  if (requestHistory.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-center py-2 italic font-sans">No attempts recorded yet</p>';
    return;
  }

  container.innerHTML = requestHistory.map(h => `
    <div class="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded">
      <div class="truncate max-w-[190px]">
        <span class="text-slate-400">${h.timestamp}</span>
        <span class="font-bold text-slate-800 ml-1 truncate">${escapeHtml(h.username)}</span>
      </div>
      <span class="font-bold text-[9px] ${h.statusColor}">${h.verdict}</span>
    </div>
  `).join('');
}

function animateTimeline() {
  const steps = ['input', 'app', 'sql', 'db', 'res'];
  steps.forEach(s => {
    const el = document.getElementById(`step-node-${s}`);
    if (el) el.className = 'p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600';
  });

  steps.forEach((s, idx) => {
    setTimeout(() => {
      const el = document.getElementById(`step-node-${s}`);
      if (el) {
        el.className = currentMode === 'vulnerable'
          ? 'p-1.5 rounded-lg bg-red-100 border border-red-400 text-red-900 font-bold transition-all'
          : 'p-1.5 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-900 font-bold transition-all';
      }
    }, idx * 120);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 11. RESET DEMO DATABASE
// ==========================================
function resetSimulationDb() {
  currentDb = JSON.parse(JSON.stringify(INITIAL_DB));
  requestHistory = [];
  currentMissionStep = 0;
  clearLoginForm();
  renderMissionGuide();
  updateRightPanelEmpty();
  renderHistoryList();
  renderImpactTable('users');

  alert('Simulation Database & Request History have been reseeded to initial state!');
}

// ==========================================
// 12. COMPARE MODULE
// ==========================================
function runComparisonTest() {
  const input = document.getElementById('compare-input').value;
  
  // Vulnerable side
  const resVuln = executeSqlSimulation(input, '', 'vulnerable');
  const vulnQueryEl = document.getElementById('compare-vuln-query');
  const vulnResultEl = document.getElementById('compare-vuln-result');
  const vulnBadge = document.getElementById('compare-vuln-badge');

  vulnQueryEl.innerHTML = `SELECT * FROM users WHERE username = '<span class="text-red-400 font-bold">${escapeHtml(input)}</span>' AND password = ''`;
  if (resVuln.success) {
    vulnBadge.textContent = 'ATTACK SUCCEEDED';
    vulnBadge.className = 'px-2 py-0.5 text-xs font-bold bg-red-200 text-red-900 rounded-full';
    vulnResultEl.textContent = `Bypassed authentication! Returned ${resVuln.rows.length} row(s). Injected text altered SQL grammar.`;
  } else if (resVuln.error) {
    vulnBadge.textContent = 'SYNTAX ERROR DISCLOSED';
    vulnBadge.className = 'px-2 py-0.5 text-xs font-bold bg-amber-200 text-amber-900 rounded-full';
    vulnResultEl.textContent = resVuln.error;
  } else {
    vulnBadge.textContent = 'INVALID CREDENTIALS';
    vulnBadge.className = 'px-2 py-0.5 text-xs font-bold bg-slate-200 text-slate-800 rounded-full';
    vulnResultEl.textContent = '0 rows returned. String did not match any user.';
  }

  // Secure side
  const resSec = executeSqlSimulation(input, '', 'secure');
  const secQueryEl = document.getElementById('compare-sec-query');
  const secResultEl = document.getElementById('compare-sec-result');
  const secBadge = document.getElementById('compare-sec-badge');

  secQueryEl.innerHTML = `SELECT * FROM users WHERE username = <span class="text-emerald-400 font-bold">?</span> AND password = <span class="text-emerald-400 font-bold">?</span><br><span class="text-slate-400 text-[10px]">Bound Param: "${escapeHtml(input)}"</span>`;
  if (resSec.blocked) {
    secBadge.textContent = 'ATTACK NEUTRALIZED';
    secBadge.className = 'px-2 py-0.5 text-xs font-bold bg-emerald-200 text-emerald-900 rounded-full';
    secResultEl.textContent = `Attack neutralized: The database searched for a literal username string "${input}". Because no account exists with that exact name, 0 rows returned safely.`;
  } else {
    secBadge.textContent = 'PROCESSED AS DATA';
    secBadge.className = 'px-2 py-0.5 text-xs font-bold bg-blue-200 text-blue-900 rounded-full';
    secResultEl.textContent = 'Execution safe. Metacharacters treated as inert content.';
  }
}

// ==========================================
// 13. IMPACT SIMULATOR
// ==========================================
function showImpactTable(table) {
  ['users', 'employees', 'students', 'products'].forEach(t => {
    const btn = document.getElementById(`btn-imp-${t}`);
    if (btn) {
      if (t === table) {
        btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white';
      } else {
        btn.className = 'px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100';
      }
    }
  });
  renderImpactTable(table);
}

function renderImpactTable(table) {
  const container = document.getElementById('impact-table-container');
  const data = currentDb[table] || [];

  if (data.length === 0) {
    container.innerHTML = '<p class="p-6 text-center text-slate-400">Table empty</p>';
    return;
  }

  const columns = Object.keys(data[0]);

  container.innerHTML = `
    <table class="w-full text-left text-xs divide-y divide-slate-200">
      <thead class="bg-slate-50 text-slate-700 font-bold">
        <tr>
          ${columns.map(c => `<th class="px-4 py-2.5 uppercase tracking-wider text-[10px]">${c.replace('_', ' ')}</th>`).join('')}
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 bg-white">
        ${data.map(row => `
          <tr class="hover:bg-slate-50 transition-colors">
            ${columns.map(c => `
              <td class="px-4 py-2.5 text-slate-800 ${c.includes('pass') ? 'font-mono text-red-600 font-bold bg-red-50/50' : ''} ${c.includes('salary') || c.includes('balance') ? 'font-mono font-semibold text-emerald-700' : ''}">
                ${escapeHtml(String(row[c]))}
              </td>
            `).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ==========================================
// 15. QUIZ MODULE
// ==========================================
const QUIZ_QUESTIONS = [
  {
    q: 'What is the root cause of SQL Injection vulnerabilities?',
    options: [
      'Weak database firewall passwords',
      'Concatenating untrusted user input directly into SQL command strings',
      'Using outdated JavaScript packages in frontend',
      'Running web servers on default port 80'
    ],
    answer: 1,
    explanation: 'SQL Injection occurs when user input is concatenated into SQL query strings, allowing untrusted input to alter the syntax and structure of the command.'
  },
  {
    q: 'Why does the payload "admin\' --" bypass password verification?',
    options: [
      'It cracks the admin password hash using rainbow tables',
      'The database crashes and defaults to guest login',
      'The double-dash (--) comments out the rest of the query, eliminating the password check',
      'It creates a temporary administrator session cookie'
    ],
    answer: 2,
    explanation: 'In SQL standard syntax, `--` marks the start of a single-line comment. Everything following it—including the password verification clause—is ignored by the parser.'
  },
  {
    q: 'What is the primary defense against SQL Injection according to OWASP?',
    options: [
      'Blacklisting quotes and semicolons in Javascript',
      'Using Prepared Statements (Parameterized Queries)',
      'Changing MySQL default port to 3307',
      'Converting all inputs to uppercase'
    ],
    answer: 1,
    explanation: 'Prepared Statements pre-compile the SQL template, ensuring that user-provided inputs are bound strictly as parameters (data), never as executable code.'
  },
  {
    q: 'What is the function of the UNION operator in SQL Injection attacks?',
    options: [
      'It encrypts database tables with AES-256',
      'It combines results from the original query with results from a secondary unauthorized table',
      'It deletes the transaction log files',
      'It shuts down the database connection'
    ],
    answer: 1,
    explanation: 'The UNION operator merges the rows of two or more SELECT queries into a single result set, enabling attackers to leak data from unrelated tables.'
  },
  {
    q: 'Which type of SQL Injection does NOT return any database data directly in the HTTP response?',
    options: [
      'In-band SQLi',
      'UNION-based SQLi',
      'Blind (Inferential) SQLi',
      'Error-based SQLi'
    ],
    answer: 2,
    explanation: 'Blind SQL Injection occurs when the application is vulnerable but does not print database results on screen. Attackers infer values via boolean true/false responses or time delays.'
  },
  {
    q: 'What happens to the payload "\' OR 1=1 --" when passed to a Prepared Statement?',
    options: [
      'The database crashes with a fatal kernel error',
      'The database executes the OR condition and logs in as admin',
      'The entire string is treated as a literal search value, returning 0 rows safely',
      'The database converts 1=1 to true automatically'
    ],
    answer: 2,
    explanation: 'Prepared Statements treat the metacharacters literally as text. The database searches for an account whose exact username is "\' OR 1=1 --", preventing any logic alteration.'
  },
  {
    q: 'Why is client-side input validation insufficient on its own for security?',
    options: [
      'It slows down browser performance significantly',
      'Attackers can easily bypass browser checks using tools like curl, Postman, or Burp Suite',
      'Browsers do not support regular expressions',
      'It interferes with search engine web crawlers'
    ],
    answer: 1,
    explanation: 'Client-side validation is purely for user experience. Any HTTP request can be generated directly without running the browser JavaScript validation.'
  },
  {
    q: 'Which database administrative practice minimizes damage if SQLi does occur?',
    options: [
      'Running the database as root with full privileges',
      'Principle of Least Privilege (granting only minimal required DB permissions)',
      'Disabling database backups',
      'Storing passwords in plain text for easy recovery'
    ],
    answer: 1,
    explanation: 'Least Privilege ensures the application DB user can only access necessary tables and cannot drop tables, read system files, or access master database schemas.'
  }
];

let quizIndex = 0;
let quizScore = 0;
let userAnswers = [];

function renderQuiz() {
  const card = document.getElementById('quiz-question-card');
  const resultCard = document.getElementById('quiz-result-card');
  const progressText = document.getElementById('quiz-progress-text');

  if (quizIndex >= QUIZ_QUESTIONS.length) {
    card.classList.add('hidden');
    resultCard.classList.remove('hidden');
    progressText.textContent = 'Completed!';
    
    resultCard.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
        <i data-lucide="award" class="w-8 h-8"></i>
      </div>
      <h3 class="text-2xl font-bold text-slate-900">Quiz Completed!</h3>
      <p class="text-sm text-slate-600">Your Score: <span class="text-blue-600 font-bold text-lg">${quizScore} / ${QUIZ_QUESTIONS.length}</span> (${Math.round((quizScore / QUIZ_QUESTIONS.length) * 100)}%)</p>
      
      <div class="max-w-md mx-auto text-left bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mt-4">
        <h4 class="font-bold text-slate-800">Faculty Viva Summary:</h4>
        <p>• <strong>Vulnerability:</strong> CWE-89 / OWASP Top 10 A03:2021.</p>
        <p>• <strong>Root Cause:</strong> Trusting client input without syntax pre-compilation.</p>
        <p>• <strong>Gold Standard Fix:</strong> Parameterized Prepared Statements across all ORMs and raw queries.</p>
      </div>

      <div class="pt-4">
        <button onclick="restartQuiz()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-md">
          Retake Quiz
        </button>
      </div>
    `;
    refreshIcons();
    if (quizScore >= 6 && window.confetti) {
      window.confetti({ particleCount: 80, spread: 60 });
    }
    return;
  }

  card.classList.remove('hidden');
  resultCard.classList.add('hidden');
  progressText.textContent = `Question ${quizIndex + 1} of ${QUIZ_QUESTIONS.length}`;

  const currentQ = QUIZ_QUESTIONS[quizIndex];
  card.innerHTML = `
    <h3 class="text-base font-bold text-slate-900 leading-snug">${currentQ.q}</h3>
    <div class="space-y-2 pt-2">
      ${currentQ.options.map((opt, optIdx) => `
        <button onclick="selectQuizAnswer(${optIdx})" id="quiz-opt-${optIdx}" class="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-xs font-medium text-slate-700 transition-all flex items-center justify-between">
          <span>${opt}</span>
          <i data-lucide="circle" class="w-4 h-4 text-slate-300"></i>
        </button>
      `).join('')}
    </div>
    <div id="quiz-feedback-box" class="hidden rounded-xl p-3.5 text-xs space-y-1"></div>
    <div class="pt-2 flex justify-end">
      <button onclick="nextQuizQuestion()" id="btn-quiz-next" class="hidden px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1">
        <span>Next Question</span>
        <i data-lucide="chevron-right" class="w-4 h-4"></i>
      </button>
    </div>
  `;
  refreshIcons();
}

function selectQuizAnswer(optIdx) {
  const currentQ = QUIZ_QUESTIONS[quizIndex];
  const isCorrect = optIdx === currentQ.answer;

  if (isCorrect) quizScore++;

  // Disable all options and show colors
  currentQ.options.forEach((_, idx) => {
    const btn = document.getElementById(`quiz-opt-${idx}`);
    btn.disabled = true;
    if (idx === currentQ.answer) {
      btn.className = 'w-full text-left p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold text-xs flex items-center justify-between';
      btn.innerHTML = `<span>${currentQ.options[idx]}</span> <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>`;
    } else if (idx === optIdx && !isCorrect) {
      btn.className = 'w-full text-left p-3.5 rounded-xl border border-red-300 bg-red-50 text-red-900 font-bold text-xs flex items-center justify-between';
      btn.innerHTML = `<span>${currentQ.options[idx]}</span> <i data-lucide="x-circle" class="w-4 h-4 text-red-600"></i>`;
    } else {
      btn.className = 'w-full text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs flex items-center justify-between opacity-60';
    }
  });

  const feedback = document.getElementById('quiz-feedback-box');
  feedback.classList.remove('hidden');
  if (isCorrect) {
    feedback.className = 'rounded-xl p-3.5 text-xs bg-emerald-50 text-emerald-900 border border-emerald-200';
    feedback.innerHTML = `<strong>Correct!</strong> ${currentQ.explanation}`;
  } else {
    feedback.className = 'rounded-xl p-3.5 text-xs bg-red-50 text-red-900 border border-red-200';
    feedback.innerHTML = `<strong>Incorrect.</strong> ${currentQ.explanation}`;
  }

  document.getElementById('btn-quiz-next').classList.remove('hidden');
  refreshIcons();
}

function nextQuizQuestion() {
  quizIndex++;
  renderQuiz();
}

function restartQuiz() {
  quizIndex = 0;
  quizScore = 0;
  renderQuiz();
}

// ==========================================
// 16. AUTOMATED LIVE DEMO MODE (HANDS-FREE)
// ==========================================
async function runAutoDemo() {
  if (autoDemoActive) return;
  autoDemoActive = true;
  switchTab('lab');

  const btn = document.getElementById('auto-demo-btn');
  btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> <span>Playing Demo...</span>';
  refreshIcons();

  const demoSequence = [
    { mode: 'vulnerable', user: 'admin', pass: 'wrongpass', delay: 1800, note: 'Step 1: Legitimate guess fails' },
    { mode: 'vulnerable', user: 'admin', pass: 'Admin@Pass2026!', delay: 2200, note: 'Step 2: Normal login works' },
    { mode: 'vulnerable', user: "admin' --", pass: '', delay: 2400, note: 'Step 3: Auth bypass with comment' },
    { mode: 'vulnerable', user: "' OR 1=1 --", pass: '', delay: 2400, note: 'Step 4: Tautology always-true bypass' },
    { mode: 'secure', user: "' OR 1=1 --", pass: '', delay: 2600, note: 'Step 5: Secure mode blocks attack completely!' }
  ];

  for (const step of demoSequence) {
    setLabMode(step.mode);
    await typeInputAnimated('target-username', step.user);
    await typeInputAnimated('target-password', step.pass);
    
    // Trigger submit
    document.getElementById('btn-submit-login').click();
    await waitMs(step.delay);
  }

  autoDemoActive = false;
  btn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5 fill-amber-600"></i> <span>Auto Demo</span>';
  refreshIcons();
}

async function typeInputAnimated(elementId, text) {
  const el = document.getElementById(elementId);
  el.value = '';
  for (let i = 0; i < text.length; i++) {
    el.value += text[i];
    checkInputPayload(el.value);
    await waitMs(45);
  }
}

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
