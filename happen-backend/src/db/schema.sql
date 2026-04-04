CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  workload_current INTEGER DEFAULT 0,
  workload_threshold_high INTEGER DEFAULT 80,
  team_lead_id INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_plain TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  team_id INTEGER,
  hire_date TEXT,
  avatar TEXT,
  leave_balance_annual INTEGER DEFAULT 20,
  leave_balance_sick INTEGER DEFAULT 10,
  wellness_days_used INTEGER DEFAULT 0,
  emergency_leaves_used INTEGER DEFAULT 0,
  last_login TEXT,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days_count INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('annual','sick','wellness','emergency')),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','queued','emergency')),
  queue_position INTEGER,
  priority_score REAL DEFAULT 0,
  proof_submitted INTEGER DEFAULT 0,
  proof_verified INTEGER DEFAULT 0,
  proof_url TEXT,
  proof_deadline TEXT,
  manager_override INTEGER DEFAULT 0,
  override_reason TEXT,
  override_by INTEGER,
  decision_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manager_id INTEGER NOT NULL,
  request_id INTEGER NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  visible_to_employee INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (manager_id) REFERENCES users(id),
  FOREIGN KEY (request_id) REFERENCES leave_requests(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER NOT NULL,
  recipient_id INTEGER,
  campaign_name TEXT,
  days INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (donor_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS donation_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  beneficiary_id INTEGER,
  goal_days INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (beneficiary_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  organizer_id INTEGER NOT NULL,
  attendees TEXT NOT NULL,
  FOREIGN KEY (organizer_id) REFERENCES users(id)
);
