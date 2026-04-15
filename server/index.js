require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { getDb, saveDb } = require('./db');

// Fail fast if JWT_SECRET is not set in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET environment variable must be set (min 32 characters).');
  console.error('Create a .env file or set it in your hosting platform.');
  process.exit(1);
}
const JWT_EXPIRES = '7d';

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow configured origin
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

// Limit request body size to 1MB
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// --- Login rate limiter (brute force protection) ---
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry) {
    // Clean old attempts (older than 1 min)
    entry.attempts = entry.attempts.filter(t => now - t < 60000);
    if (entry.attempts.length >= 5) {
      return res.status(429).json({ error: 'Previse pokusaja. Sacekajte 1 minut.' });
    }
  }
  next();
}

// --- Auth middleware ---
async function authRequired(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Niste prijavljeni' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Sesija je istekla, prijavite se ponovo' });
  }

  req.user = decoded;

  // Backfill role from DB for old tokens issued before role was added to JWT
  if (!req.user.role) {
    try {
      const db = await getDb();
      const r = db.exec('SELECT role, active FROM users WHERE id = ?', [decoded.id]);
      if (r.length && r[0].values.length) {
        const [role, active] = r[0].values[0];
        if (Number(active) === 0) {
          res.clearCookie('token');
          return res.status(403).json({ error: 'Nalog je deaktiviran' });
        }
        req.user.role = role || 'user';
      } else {
        req.user.role = 'user';
      }
    } catch (err) {
      req.user.role = 'user';
    }
  }

  next();
}

// --- Admin-only middleware (must come after authRequired) ---
async function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();

  // Self-healing: JWT might be stale (issued before role was added or after a role change).
  // Re-check the DB before rejecting.
  try {
    if (req.user && req.user.id) {
      const db = await getDb();
      const r = db.exec('SELECT role FROM users WHERE id = ?', [req.user.id]);
      if (r.length && r[0].values.length && r[0].values[0][0] === 'admin') {
        req.user.role = 'admin';
        return next();
      }
    }
  } catch (err) {
    console.error('requireAdmin DB check failed:', err);
  }

  return res.status(403).json({ error: 'Samo admin moze ovo da uradi' });
}

// --- Auth endpoints (public) ---

// POST /api/auth/login
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username i password su obavezni' });

    const result = db.exec('SELECT id, username, password_hash, display_name, role, active FROM users WHERE username = ?', [username]);
    if (!result.length || !result[0].values.length) {
      // Track failed attempt
      const ip = req.ip;
      if (!loginAttempts.has(ip)) loginAttempts.set(ip, { attempts: [] });
      loginAttempts.get(ip).attempts.push(Date.now());
      return res.status(401).json({ error: 'Pogresan username ili password' });
    }

    const [id, uname, hash, displayName, role, active] = result[0].values[0];

    if (Number(active) === 0) {
      return res.status(403).json({ error: 'Nalog je deaktiviran. Kontaktirajte administratora.' });
    }

    const valid = bcrypt.compareSync(password, hash);
    if (!valid) {
      const ip = req.ip;
      if (!loginAttempts.has(ip)) loginAttempts.set(ip, { attempts: [] });
      loginAttempts.get(ip).attempts.push(Date.now());
      return res.status(401).json({ error: 'Pogresan username ili password' });
    }

    const userRole = role || 'user';
    const token = jwt.sign({ id, username: uname, displayName, role: userRole }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ success: true, user: { id, username: uname, displayName, role: userRole } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// GET /api/auth/me - check current session
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Re-fetch role/active from DB so role changes take effect without re-login
    const db = await getDb();
    const result = db.exec('SELECT role, active, display_name FROM users WHERE id = ?', [decoded.id]);
    if (!result.length || !result[0].values.length) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'User not found' });
    }
    const [role, active, displayName] = result[0].values[0];
    if (Number(active) === 0) {
      res.clearCookie('token');
      return res.status(403).json({ error: 'Nalog je deaktiviran' });
    }
    res.json({ user: { id: decoded.id, username: decoded.username, displayName: displayName || decoded.displayName, role: role || 'user' } });
  } catch (err) {
    res.clearCookie('token');
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/change-password - user changes their own password
app.post('/api/auth/change-password', authRequired, async (req, res) => {
  try {
    const db = await getDb();
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Trenutna i nova sifra su obavezne' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Nova sifra mora imati najmanje 8 karaktera' });
    }

    const result = db.exec('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ error: 'Korisnik nije pronadjen' });
    }
    const hash = result[0].values[0][0];
    if (!bcrypt.compareSync(current_password, hash)) {
      return res.status(401).json({ error: 'Trenutna sifra nije ispravna' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Protect all /api routes (except auth) ---
app.use('/api', (req, res, next) => {
  // Skip auth endpoints
  if (req.path.startsWith('/auth/')) return next();
  authRequired(req, res, next);
});

// GET /api/leads - list leads with filtering
app.get('/api/leads', async (req, res) => {
  try {
    const db = await getDb();
    const { category, subcategory, outreach_status, search, investor_size, construction_phase, city, has_phone, has_email, verified, assigned_to, mine } = req.query;

    let where = ['1=1'];
    let params = [];

    // Permission / scope filter:
    //  - Everyone (admin and user) can see all leads by default
    //  - ?mine=1 narrows to leads assigned to current user
    //  - admin can filter by assigned_to=<userId> or 'unassigned'
    if (mine === '1') {
      where.push('assigned_to = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'admin') {
      if (assigned_to === 'unassigned') {
        where.push('assigned_to IS NULL');
      } else if (assigned_to) {
        where.push('assigned_to = ?');
        params.push(parseInt(assigned_to, 10));
      }
    }

    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (subcategory) {
      where.push('subcategory = ?');
      params.push(subcategory);
    }
    if (outreach_status) {
      where.push('outreach_status = ?');
      params.push(outreach_status);
    }
    if (investor_size) {
      where.push('investor_size = ?');
      params.push(investor_size);
    }
    if (construction_phase) {
      where.push('construction_phase LIKE ?');
      params.push(`%${construction_phase}%`);
    }
    if (city) {
      // Match both ASCII and Serbian diacritics variants
      const toAscii = s => s.replace(/[čć]/g,'c').replace(/[ČĆ]/g,'C').replace(/š/g,'s').replace(/Š/g,'S').replace(/ž/g,'z').replace(/Ž/g,'Z').replace(/đ/g,'d').replace(/Đ/g,'D');
      const toCyrillic = s => s.replace(/c/gi, m => m === 'c' ? 'č' : 'Č').replace(/s/gi, m => m === 's' ? 'š' : 'Š').replace(/z/gi, m => m === 'z' ? 'ž' : 'Ž');
      const ascii = toAscii(city);
      // Search with both the original input AND the ascii-stripped version
      where.push('(city LIKE ? OR city LIKE ?)');
      params.push(`%${city}%`, `%${ascii}%`);
    }
    if (has_phone === '1') {
      where.push("phone1 IS NOT NULL AND phone1 != ''");
    } else if (has_phone === '0') {
      where.push("(phone1 IS NULL OR phone1 = '')");
    }
    if (has_email === '1') {
      where.push("email IS NOT NULL AND email != ''");
    } else if (has_email === '0') {
      where.push("(email IS NULL OR email = '')");
    }
    if (verified === 'all') {
      where.push("phone_verified = 1 AND email_verified = 1");
    } else if (verified === 'phone') {
      where.push("phone_verified = 1");
    } else if (verified === 'email') {
      where.push("email_verified = 1");
    } else if (verified === 'none') {
      where.push("phone_verified = 0 AND email_verified = 0");
    }
    if (search) {
      where.push('(name LIKE ? OR email LIKE ? OR phone1 LIKE ? OR project_name LIKE ? OR contact_person LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    // Rewrite WHERE clause to use 'l.' prefix since we're joining
    const whereWithPrefix = where.map(w => {
      // Only prefix bare column names (skip already-prefixed and complex expressions)
      return w
        .replace(/\bassigned_to\b/g, 'l.assigned_to')
        .replace(/\bcategory\b/g, 'l.category')
        .replace(/\bsubcategory\b/g, 'l.subcategory')
        .replace(/\boutreach_status\b/g, 'l.outreach_status')
        .replace(/\binvestor_size\b/g, 'l.investor_size')
        .replace(/\bconstruction_phase\b/g, 'l.construction_phase')
        .replace(/\bcity\b/g, 'l.city')
        .replace(/\bphone1\b/g, 'l.phone1')
        .replace(/\bphone_verified\b/g, 'l.phone_verified')
        .replace(/\bemail_verified\b/g, 'l.email_verified')
        .replace(/\bemail\b(?!\d)/g, 'l.email')
        .replace(/\bname\b/g, 'l.name')
        .replace(/\bproject_name\b/g, 'l.project_name')
        .replace(/\bcontact_person\b/g, 'l.contact_person');
    });

    const sql = `SELECT l.*, u.display_name as assigned_to_name, u.username as assigned_to_username
      FROM leads l
      LEFT JOIN users u ON u.id = l.assigned_to
      WHERE ${whereWithPrefix.join(' AND ')} ORDER BY
      CASE l.outreach_status
        WHEN 'meeting_scheduled' THEN 1
        WHEN 'negotiation' THEN 2
        WHEN 'called' THEN 3
        WHEN 'not_contacted' THEN 4
        WHEN 'deal_closed' THEN 5
        WHEN 'not_interested' THEN 6
      END, l.name ASC`;

    const result = db.exec(sql, params);
    if (!result.length) return res.json([]);

    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id
app.get('/api/leads/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`
      SELECT l.*, u.display_name as assigned_to_name, u.username as assigned_to_username
      FROM leads l
      LEFT JOIN users u ON u.id = l.assigned_to
      WHERE l.id = ?
    `, [req.params.id]);
    if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });

    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => { obj[col] = result[0].values[0][i]; });

    // Everyone can VIEW any lead — edit permission is enforced separately on PUT
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id - update lead
app.put('/api/leads/:id', async (req, res) => {
  try {
    const db = await getDb();
    const fields = req.body;
    const id = req.params.id;

    console.log('PUT /api/leads/' + id, 'body:', JSON.stringify(fields));

    // Fetch old record so we can log only real diffs
    const oldResult = db.exec('SELECT * FROM leads WHERE id = ?', [id]);
    if (!oldResult.length || !oldResult[0].values.length) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const oldLead = {};
    oldResult[0].columns.forEach((col, i) => { oldLead[col] = oldResult[0].values[0][i]; });

    // Permission: non-admins can only edit leads assigned to them
    if (req.user.role !== 'admin' && oldLead.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Nemate dozvolu da menjate ovaj lead' });
    }

    // Build SET clause from provided fields
    const allowedFields = [
      'name', 'city', 'address', 'website', 'phone1', 'phone2', 'email', 'email2',
      'contact_person', 'stars', 'num_rooms', 'google_rating', 'email_status',
      'clinic_type', 'has_stationary', 'has_surgery', 'has_maternity', 'has_palliative',
      'num_beds', 'relevance', 'project_name', 'area_sqm', 'num_apartments',
      'construction_phase', 'investor_size', 'investment_eur', 'opening_date',
      'outreach_status', 'call_date', 'meeting_date', 'meeting_notes', 'notes',
      'subcategory', 'phone_verified', 'email_verified',
      'deal_value', 'deal_description', 'deal_date'
    ];

    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }

    // Auto-set outreach_status when dates are set
    if (fields.meeting_date && fields.meeting_date.trim() && !fields.outreach_status) {
      sets.push('outreach_status = ?');
      params.push('meeting_scheduled');
      fields.outreach_status = 'meeting_scheduled';
    } else if (fields.call_date && fields.call_date.trim() && !fields.outreach_status && !fields.meeting_date) {
      sets.push('outreach_status = ?');
      params.push('called');
      fields.outreach_status = 'called';
    }

    if (sets.length === 0) {
      console.log('400 No valid fields. Received body:', JSON.stringify(fields), 'Keys:', Object.keys(fields));
      return res.status(400).json({ error: 'No valid fields' });
    }

    sets.push("updated_at = datetime('now')");
    params.push(id);

    db.run(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`, params);
    saveDb();

    // Helper to detect whether a field actually changed
    const changed = (key) => fields[key] !== undefined && String(fields[key] ?? '') !== String(oldLead[key] ?? '');
    const logActivity = (action, details, action_type) => {
      db.run('INSERT INTO activity_log (lead_id, action, details, action_type, user_id) VALUES (?, ?, ?, ?, ?)', [
        id, action, details, action_type, req.user.id
      ]);
    };

    // Status / dates
    if (changed('outreach_status')) {
      logActivity('status_change', `Status promenjen u: ${fields.outreach_status}`, 'status');
    }
    if (changed('call_date')) {
      logActivity('call_logged', fields.call_date ? `Poziv zakazan: ${fields.call_date}` : 'Datum poziva uklonjen', 'call');
    }
    if (changed('meeting_date')) {
      logActivity('meeting_scheduled', fields.meeting_date ? `Sastanak zakazan: ${fields.meeting_date}` : 'Datum sastanka uklonjen', 'meeting');
    }

    // Verifikacija
    if (changed('phone_verified')) {
      logActivity('verification', Number(fields.phone_verified) === 1 ? 'Telefon verifikovan' : 'Verifikacija telefona uklonjena', 'verification');
    }
    if (changed('email_verified')) {
      logActivity('verification', Number(fields.email_verified) === 1 ? 'Email verifikovan' : 'Verifikacija email-a uklonjena', 'verification');
    }

    // Kontakt info
    const contactFields = [
      ['phone1', 'Telefon 1'],
      ['phone2', 'Telefon 2'],
      ['email', 'Email'],
      ['email2', 'Email 2'],
      ['contact_person', 'Kontakt osoba'],
    ];
    for (const [key, label] of contactFields) {
      if (changed(key)) {
        const val = fields[key];
        logActivity('contact_update', val ? `${label} azuriran: ${val}` : `${label} obrisan`, 'contact');
      }
    }

    // Beleske
    if (changed('notes')) {
      const preview = (fields.notes || '').slice(0, 120);
      logActivity('notes_update', fields.notes ? `Glavna beleska azurirana: ${preview}${fields.notes.length > 120 ? '...' : ''}` : 'Glavna beleska obrisana', 'note');
    }
    if (changed('meeting_notes')) {
      const preview = (fields.meeting_notes || '').slice(0, 120);
      logActivity('notes_update', fields.meeting_notes ? `Beleska sastanka azurirana: ${preview}${fields.meeting_notes.length > 120 ? '...' : ''}` : 'Beleska sastanka obrisana', 'note');
    }

    // Deal info
    if (changed('deal_value') || changed('deal_description') || changed('deal_date')) {
      const parts = [];
      if (fields.deal_value !== undefined) parts.push(`vrednost: ${fields.deal_value || '-'}`);
      if (fields.deal_date !== undefined) parts.push(`datum: ${fields.deal_date || '-'}`);
      if (fields.deal_description !== undefined) parts.push(`opis: ${(fields.deal_description || '').slice(0, 80)}`);
      logActivity('deal_update', `Dogovor azuriran (${parts.join(', ')})`, 'deal');
    }

    saveDb();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads - create new lead (any user; auto-assigns to creator unless admin specifies)
app.post('/api/leads', async (req, res) => {
  try {
    const db = await getDb();
    const f = req.body;
    const n = (v) => v === undefined ? null : v;

    // Non-admins always create leads assigned to themselves.
    // Admins may specify assigned_to in body, otherwise unassigned by default.
    let assignedTo;
    let assignedBy = null;
    let assignedAt = null;
    if (req.user.role === 'admin') {
      assignedTo = f.assigned_to !== undefined ? (f.assigned_to || null) : null;
      if (assignedTo) {
        assignedBy = req.user.id;
        assignedAt = new Date().toISOString();
      }
    } else {
      assignedTo = req.user.id;
      assignedBy = req.user.id;
      assignedAt = new Date().toISOString();
    }

    db.run(`INSERT INTO leads (category, subcategory, name, city, address, website,
      phone1, phone2, email, email2, contact_person, stars, num_rooms, google_rating,
      clinic_type, has_stationary, has_surgery, has_maternity, has_palliative, num_beds,
      relevance, project_name, area_sqm, num_apartments, construction_phase, investor_size,
      investment_eur, opening_date, notes, assigned_to, assigned_at, assigned_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      n(f.category), n(f.subcategory), n(f.name), n(f.city), n(f.address), n(f.website),
      n(f.phone1), n(f.phone2), n(f.email), n(f.email2), n(f.contact_person), n(f.stars), n(f.num_rooms), n(f.google_rating),
      n(f.clinic_type), f.has_stationary || 0, f.has_surgery || 0, f.has_maternity || 0, f.has_palliative || 0,
      n(f.num_beds), n(f.relevance), n(f.project_name), n(f.area_sqm), n(f.num_apartments),
      n(f.construction_phase), n(f.investor_size), n(f.investment_eur), n(f.opening_date), n(f.notes),
      assignedTo, assignedAt, assignedBy
    ]);

    const result = db.exec('SELECT last_insert_rowid()');
    const newId = result[0].values[0][0];

    // Log creation in activity log
    db.run('INSERT INTO activity_log (lead_id, action, details, action_type, user_id) VALUES (?, ?, ?, ?, ?)', [
      newId, 'lead_created', `Lead kreiran: ${f.name || ''}`, 'system', req.user.id
    ]);
    saveDb();

    res.json({ success: true, id: newId });
  } catch (err) {
    console.error('POST /api/leads error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id - admin only
app.delete('/api/leads/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM activity_log WHERE lead_id = ?', [req.params.id]);
    db.run('DELETE FROM leads WHERE id = ?', [req.params.id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats - dashboard statistics
app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();

    const totalResult = db.exec('SELECT COUNT(*) FROM leads');
    const total = totalResult[0].values[0][0];

    const byCategoryResult = db.exec(`SELECT category, COUNT(*) as cnt FROM leads GROUP BY category`);
    const byCategory = {};
    if (byCategoryResult.length) {
      byCategoryResult[0].values.forEach(([cat, cnt]) => { byCategory[cat] = cnt; });
    }

    const byStatusResult = db.exec(`SELECT outreach_status, COUNT(*) as cnt FROM leads GROUP BY outreach_status`);
    const byStatus = {};
    if (byStatusResult.length) {
      byStatusResult[0].values.forEach(([status, cnt]) => { byStatus[status] = cnt; });
    }

    res.json({ total, byCategory, byStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity/daily?date=YYYY-MM-DD - all activity for one day, grouped by lead
app.get('/api/activity/daily', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const date = req.query.date; // expected YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
    }

    const result = db.exec(`
      SELECT
        a.id, a.lead_id, a.action, a.details, a.action_type, a.created_at,
        l.name, l.city, l.category, l.subcategory, l.outreach_status, l.phone1, l.email
      FROM activity_log a
      JOIN leads l ON l.id = a.lead_id
      WHERE date(a.created_at) = ?
      ORDER BY a.created_at DESC
    `, [date]);

    if (!result.length) return res.json([]);

    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    // Group by lead_id
    const byLead = new Map();
    for (const r of rows) {
      if (!byLead.has(r.lead_id)) {
        byLead.set(r.lead_id, {
          lead: {
            id: r.lead_id,
            name: r.name,
            city: r.city,
            category: r.category,
            subcategory: r.subcategory,
            outreach_status: r.outreach_status,
            phone1: r.phone1,
            email: r.email,
          },
          activities: [],
          lastActivityAt: r.created_at,
        });
      }
      const entry = byLead.get(r.lead_id);
      entry.activities.push({
        id: r.id,
        action: r.action,
        details: r.details,
        action_type: r.action_type,
        created_at: r.created_at,
      });
      if (r.created_at > entry.lastActivityAt) entry.lastActivityAt = r.created_at;
    }

    // Sort groups by most recent activity
    const grouped = Array.from(byLead.values()).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    res.json(grouped);
  } catch (err) {
    console.error('GET /api/activity/daily error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/activity/:leadId - activity log
app.get('/api/activity/:leadId', async (req, res) => {
  try {
    const db = await getDb();

    // Permission: non-admins can only see activity for their own leads
    if (req.user.role !== 'admin') {
      const ownerR = db.exec('SELECT assigned_to FROM leads WHERE id = ?', [req.params.leadId]);
      if (!ownerR.length || !ownerR[0].values.length) {
        return res.status(404).json({ error: 'Lead nije pronadjen' });
      }
      if (ownerR[0].values[0][0] !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu za ovaj lead' });
      }
    }

    const result = db.exec(`
      SELECT a.*, u.display_name as user_name, u.username as user_username
      FROM activity_log a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.lead_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.leadId]);
    if (!result.length) return res.json([]);

    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/activity/:leadId - create note/comment
app.post('/api/activity/:leadId', async (req, res) => {
  try {
    const db = await getDb();
    const { action, details, action_type } = req.body;

    // Permission: non-admins can only post activity for leads assigned to them
    if (req.user.role !== 'admin') {
      const ownerR = db.exec('SELECT assigned_to FROM leads WHERE id = ?', [req.params.leadId]);
      if (!ownerR.length || !ownerR[0].values.length) {
        return res.status(404).json({ error: 'Lead nije pronadjen' });
      }
      if (ownerR[0].values[0][0] !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu za ovaj lead' });
      }
    }

    db.run('INSERT INTO activity_log (lead_id, action, details, action_type, user_id) VALUES (?, ?, ?, ?, ?)', [
      req.params.leadId, action || 'Beleska', details || '', action_type || 'note', req.user.id
    ]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/activity/:activityId - delete a single activity entry
app.delete('/api/activity/:activityId', async (req, res) => {
  try {
    const db = await getDb();
    const activityId = parseInt(req.params.activityId, 10);
    if (!Number.isFinite(activityId)) return res.status(400).json({ error: 'Invalid activity ID' });

    // Verify the activity exists
    const result = db.exec('SELECT id FROM activity_log WHERE id = ?', [activityId]);
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    db.run('DELETE FROM activity_log WHERE id = ?', [activityId]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// === USERS MANAGEMENT (admin) ===
// ============================================================

// GET /api/users - list all users with stats
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.role,
        u.active,
        u.created_at,
        u.created_by,
        (SELECT COUNT(*) FROM leads WHERE assigned_to = u.id) as assigned_count,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'call' AND date(created_at) = date('now')) as calls_today,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'call' AND created_at >= date('now', '-7 days')) as calls_week,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'meeting' AND created_at >= date('now', '-7 days')) as meetings_week,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'deal' AND created_at >= date('now', '-7 days')) as deals_week
      FROM users u
      ORDER BY u.active DESC, u.username ASC
    `);

    if (!result.length) return res.json([]);
    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - create user
app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const { username, password, display_name, role } = req.body || {};

    if (!username || typeof username !== 'string' || username.length < 3 || username.length > 32) {
      return res.status(400).json({ error: 'Username mora imati 3-32 karaktera' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Sifra mora imati najmanje 8 karaktera' });
    }
    const userRole = role || 'user';
    if (!['admin', 'user'].includes(userRole)) {
      return res.status(400).json({ error: 'Neispravna uloga' });
    }

    // Check if username exists
    const existing = db.exec('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length && existing[0].values.length) {
      return res.status(409).json({ error: 'Korisnik vec postoji' });
    }

    const hash = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO users (username, password_hash, display_name, role, active, created_by) VALUES (?, ?, ?, ?, 1, ?)',
      [username, hash, display_name || username, userRole, req.user.id]
    );

    const idResult = db.exec('SELECT last_insert_rowid()');
    const newId = idResult[0].values[0][0];
    saveDb();
    res.json({ success: true, id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - update display_name, role, active
app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Neispravan ID' });

    const { display_name, role, active } = req.body || {};

    // Safety checks for self
    if (id === req.user.id) {
      if (role !== undefined && role !== 'admin') {
        return res.status(403).json({ error: 'Ne mozete sebi oduzeti admin status' });
      }
      if (active !== undefined && Number(active) === 0) {
        return res.status(403).json({ error: 'Ne mozete deaktivirati svoj nalog' });
      }
    }

    if (role !== undefined && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Neispravna uloga' });
    }

    // Verify user exists
    const existing = db.exec('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ error: 'Korisnik nije pronadjen' });
    }

    const sets = [];
    const params = [];
    if (display_name !== undefined) {
      sets.push('display_name = ?');
      params.push(display_name);
    }
    if (role !== undefined) {
      sets.push('role = ?');
      params.push(role);
    }
    if (active !== undefined) {
      sets.push('active = ?');
      params.push(Number(active) === 1 ? 1 : 0);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nema polja za azuriranje' });
    }

    params.push(id);
    db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/reset-password - admin resets another user's password
app.post('/api/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Neispravan ID' });

    const { new_password } = req.body || {};
    if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'Sifra mora imati najmanje 8 karaktera' });
    }

    const existing = db.exec('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ error: 'Korisnik nije pronadjen' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - soft delete (set active=0) AND unassign their leads
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Neispravan ID' });

    if (id === req.user.id) {
      return res.status(403).json({ error: 'Ne mozete obrisati svoj nalog' });
    }

    const existing = db.exec('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing.length || !existing[0].values.length) {
      return res.status(404).json({ error: 'Korisnik nije pronadjen' });
    }

    // Count leads currently assigned to this user before unassign
    const countR = db.exec('SELECT COUNT(*) FROM leads WHERE assigned_to = ?', [id]);
    const unassignedCount = countR.length ? countR[0].values[0][0] : 0;

    db.run('UPDATE users SET active = 0 WHERE id = ?', [id]);
    db.run('UPDATE leads SET assigned_to = NULL, assigned_at = NULL, assigned_by = NULL WHERE assigned_to = ?', [id]);
    saveDb();

    res.json({ success: true, unassigned_leads: unassignedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// === MY NOTIFICATIONS (any logged-in user) ===
// ============================================================

// GET /api/my/notifications
// Returns counts/info about leads that were assigned to the current user
// after they last opened the "Dodeljeni leadovi" view.
app.get('/api/my/notifications', async (req, res) => {
  try {
    const db = await getDb();

    // Get user's last_assignments_viewed_at
    const uR = db.exec('SELECT last_assignments_viewed_at FROM users WHERE id = ?', [req.user.id]);
    const lastSeen = (uR.length && uR[0].values.length) ? uR[0].values[0][0] : null;

    // Total leads assigned to me
    const totalR = db.exec('SELECT COUNT(*) FROM leads WHERE assigned_to = ?', [req.user.id]);
    const total = (totalR.length && totalR[0].values.length) ? Number(totalR[0].values[0][0]) : 0;

    // New = assigned_at > lastSeen (or all of them if user never opened the view)
    let newCount = 0;
    let newLeads = [];
    if (lastSeen) {
      const r = db.exec(
        `SELECT id, name, category, assigned_at
         FROM leads
         WHERE assigned_to = ? AND assigned_at IS NOT NULL AND assigned_at > ?
         ORDER BY assigned_at DESC LIMIT 20`,
        [req.user.id, lastSeen]
      );
      if (r.length && r[0].values.length) {
        newCount = r[0].values.length;
        newLeads = r[0].values.map(row => ({
          id: row[0], name: row[1], category: row[2], assigned_at: row[3],
        }));
      }
    } else {
      // Never seen before — all assigned leads count as "new"
      const r = db.exec(
        `SELECT id, name, category, assigned_at
         FROM leads
         WHERE assigned_to = ? AND assigned_at IS NOT NULL
         ORDER BY assigned_at DESC LIMIT 20`,
        [req.user.id]
      );
      if (r.length && r[0].values.length) {
        newCount = r[0].values.length;
        newLeads = r[0].values.map(row => ({
          id: row[0], name: row[1], category: row[2], assigned_at: row[3],
        }));
      }
    }

    res.json({ total, newCount, newLeads, lastSeen });
  } catch (err) {
    console.error('GET /api/my/notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/my/notifications/seen
// Marks the current moment as the user's "last viewed assignments" timestamp.
app.post('/api/my/notifications/seen', async (req, res) => {
  try {
    const db = await getDb();
    const nowIso = new Date().toISOString();
    db.run('UPDATE users SET last_assignments_viewed_at = ? WHERE id = ?', [nowIso, req.user.id]);
    saveDb();
    res.json({ success: true, lastSeen: nowIso });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// === LEAD ASSIGNMENT (admin) ===
// ============================================================

// POST /api/leads/assign - bulk assign
app.post('/api/leads/assign', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const { lead_ids, user_id } = req.body || {};

    if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids mora biti niz' });
    }

    let targetUserId = null;
    let targetDisplayName = null;
    if (user_id !== null && user_id !== undefined) {
      const uid = parseInt(user_id, 10);
      if (!Number.isFinite(uid)) return res.status(400).json({ error: 'Neispravan user_id' });
      const userR = db.exec('SELECT id, display_name, active FROM users WHERE id = ?', [uid]);
      if (!userR.length || !userR[0].values.length) {
        return res.status(404).json({ error: 'Korisnik nije pronadjen' });
      }
      const [, dispName, activeFlag] = userR[0].values[0];
      if (Number(activeFlag) !== 1) {
        return res.status(400).json({ error: 'Korisnik nije aktivan' });
      }
      targetUserId = uid;
      targetDisplayName = dispName;
    }

    let assignedCount = 0;
    const nowIso = new Date().toISOString();
    for (const rawId of lead_ids) {
      const lid = parseInt(rawId, 10);
      if (!Number.isFinite(lid)) continue;

      // Verify lead exists
      const leadR = db.exec('SELECT id FROM leads WHERE id = ?', [lid]);
      if (!leadR.length || !leadR[0].values.length) continue;

      if (targetUserId === null) {
        db.run('UPDATE leads SET assigned_to = NULL, assigned_at = NULL, assigned_by = NULL WHERE id = ?', [lid]);
      } else {
        db.run('UPDATE leads SET assigned_to = ?, assigned_at = ?, assigned_by = ? WHERE id = ?', [
          targetUserId, nowIso, req.user.id, lid
        ]);
      }

      const details = targetUserId === null
        ? 'Uklonjena dodela'
        : `Dodeljen useru: ${targetDisplayName || ''}`;
      db.run('INSERT INTO activity_log (lead_id, action, details, action_type, user_id) VALUES (?, ?, ?, ?, ?)', [
        lid, 'assignment', details, 'system', req.user.id
      ]);
      assignedCount++;
    }

    saveDb();
    res.json({ success: true, assigned: assignedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// === EMPLOYEE PERFORMANCE & ACTIVITY (admin) ===
// ============================================================

// GET /api/admin/employee-performance?from=YYYY-MM-DD&to=YYYY-MM-DD
app.get('/api/admin/employee-performance', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const fromDefault = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDefault = new Date().toISOString().slice(0, 10);
    const from = req.query.from && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : fromDefault;
    const to = req.query.to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : toDefault;

    const result = db.exec(`
      SELECT
        u.id as user_id,
        u.username,
        u.display_name,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'call' AND date(created_at) BETWEEN ? AND ?) as calls,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'meeting' AND date(created_at) BETWEEN ? AND ?) as meetings,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'note' AND date(created_at) BETWEEN ? AND ?) as notes,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'status' AND date(created_at) BETWEEN ? AND ?) as status_changes,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND action_type = 'deal' AND date(created_at) BETWEEN ? AND ?) as deals,
        (SELECT COUNT(*) FROM activity_log WHERE user_id = u.id AND date(created_at) BETWEEN ? AND ?) as total_actions,
        (SELECT COUNT(DISTINCT lead_id) FROM activity_log WHERE user_id = u.id AND date(created_at) BETWEEN ? AND ?) as leads_touched
      FROM users u
      WHERE u.active = 1
      ORDER BY u.username ASC
    `, [from, to, from, to, from, to, from, to, from, to, from, to, from, to]);

    if (!result.length) return res.json([]);
    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/employee-activity?user_id=X&date=YYYY-MM-DD
app.get('/api/admin/employee-activity', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
    }

    let sql;
    let params;
    if (req.query.user_id) {
      const uid = parseInt(req.query.user_id, 10);
      if (!Number.isFinite(uid)) return res.status(400).json({ error: 'Neispravan user_id' });
      sql = `
        SELECT
          a.id, a.lead_id, a.action, a.details, a.action_type, a.created_at, a.user_id,
          l.name, l.city, l.category, l.subcategory, l.outreach_status, l.phone1, l.email,
          u.display_name as user_name, u.username as user_username
        FROM activity_log a
        JOIN leads l ON l.id = a.lead_id
        LEFT JOIN users u ON u.id = a.user_id
        WHERE date(a.created_at) = ? AND a.user_id = ?
        ORDER BY a.created_at DESC
      `;
      params = [date, uid];
    } else {
      sql = `
        SELECT
          a.id, a.lead_id, a.action, a.details, a.action_type, a.created_at, a.user_id,
          l.name, l.city, l.category, l.subcategory, l.outreach_status, l.phone1, l.email,
          u.display_name as user_name, u.username as user_username
        FROM activity_log a
        JOIN leads l ON l.id = a.lead_id
        LEFT JOIN users u ON u.id = a.user_id
        WHERE date(a.created_at) = ?
        ORDER BY a.created_at DESC
      `;
      params = [date];
    }

    const result = db.exec(sql, params);
    if (!result.length) return res.json([]);

    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });

    // Group by lead_id (mirrors /api/activity/daily)
    const byLead = new Map();
    for (const r of rows) {
      if (!byLead.has(r.lead_id)) {
        byLead.set(r.lead_id, {
          lead: {
            id: r.lead_id,
            name: r.name,
            city: r.city,
            category: r.category,
            subcategory: r.subcategory,
            outreach_status: r.outreach_status,
            phone1: r.phone1,
            email: r.email,
          },
          activities: [],
          lastActivityAt: r.created_at,
        });
      }
      const entry = byLead.get(r.lead_id);
      entry.activities.push({
        id: r.id,
        action: r.action,
        details: r.details,
        action_type: r.action_type,
        created_at: r.created_at,
        user_id: r.user_id,
        user_name: r.user_name,
        user_username: r.user_username,
      });
      if (r.created_at > entry.lastActivityAt) entry.lastActivityAt = r.created_at;
    }

    const grouped = Array.from(byLead.values()).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    res.json(grouped);
  } catch (err) {
    console.error('GET /api/admin/employee-activity error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/pipeline - funnel data
app.get('/api/stats/pipeline', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT outreach_status, category, COUNT(*) as cnt FROM leads GROUP BY outreach_status, category`);
    if (!result.length) return res.json([]);
    const rows = result[0].values.map(([status, category, cnt]) => ({ status, category, cnt }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/cities - top cities
app.get('/api/stats/cities', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT city, COUNT(*) as cnt FROM leads WHERE city IS NOT NULL AND city != '' GROUP BY city ORDER BY cnt DESC LIMIT 10`);
    if (!result.length) return res.json([]);
    const rows = result[0].values.map(([city, cnt]) => ({ city, cnt }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/conversion - conversion by category
app.get('/api/stats/conversion', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`SELECT category, outreach_status, COUNT(*) as cnt FROM leads GROUP BY category, outreach_status`);
    if (!result.length) return res.json([]);
    const rows = result[0].values.map(([category, status, cnt]) => ({ category, status, cnt }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/weekly-activity - activity per week (last 12 weeks)
app.get('/api/stats/weekly-activity', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    // Activity log entries by week
    const actResult = db.exec(`
      SELECT strftime('%Y-%W', created_at) as week, action, COUNT(*) as cnt
      FROM activity_log
      WHERE created_at >= date('now', '-84 days')
      GROUP BY week, action
    `);
    const activity = actResult.length ? actResult[0].values.map(([week, action, cnt]) => ({ week, action, cnt })) : [];

    // Leads with call_date by week
    const callResult = db.exec(`
      SELECT strftime('%Y-%W', call_date) as week, COUNT(*) as cnt
      FROM leads WHERE call_date IS NOT NULL AND call_date >= date('now', '-84 days')
      GROUP BY week
    `);
    const calls = callResult.length ? callResult[0].values.map(([week, cnt]) => ({ week, type: 'calls', cnt })) : [];

    // Leads with meeting_date by week
    const meetResult = db.exec(`
      SELECT strftime('%Y-%W', meeting_date) as week, COUNT(*) as cnt
      FROM leads WHERE meeting_date IS NOT NULL AND meeting_date >= date('now', '-84 days')
      GROUP BY week
    `);
    const meetings = meetResult.length ? meetResult[0].values.map(([week, cnt]) => ({ week, type: 'meetings', cnt })) : [];

    res.json({ activity, calls, meetings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/weekly-summary - this week vs last week
app.get('/api/stats/weekly-summary', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();

    const getWeekData = (offset) => {
      const start = offset === 0 ? "date('now', 'weekday 0', '-6 days')" : "date('now', 'weekday 0', '-13 days')";
      const end = offset === 0 ? "date('now', '+1 day')" : "date('now', 'weekday 0', '-6 days')";

      const statusChanges = db.exec(`
        SELECT action, COUNT(*) as cnt FROM activity_log
        WHERE created_at >= ${start} AND created_at < ${end}
        GROUP BY action
      `);
      const sc = {};
      if (statusChanges.length) statusChanges[0].values.forEach(([a, c]) => { sc[a] = c; });

      const newLeads = db.exec(`SELECT COUNT(*) FROM leads WHERE created_at >= ${start} AND created_at < ${end}`);
      const meetingsSet = db.exec(`
        SELECT COUNT(*) FROM leads WHERE meeting_date IS NOT NULL
        AND meeting_date >= ${start} AND meeting_date < ${end}
      `);
      const dealsClosed = db.exec(`
        SELECT COUNT(*) FROM activity_log WHERE action = 'status_change'
        AND details LIKE '%deal_closed%' AND created_at >= ${start} AND created_at < ${end}
      `);

      return {
        newLeads: newLeads.length ? newLeads[0].values[0][0] : 0,
        statusChanges: sc,
        calls: sc['call_logged'] || 0,
        meetings: meetingsSet.length ? meetingsSet[0].values[0][0] : 0,
        deals: dealsClosed.length ? dealsClosed[0].values[0][0] : 0,
        totalActivity: Object.values(sc).reduce((a, b) => a + b, 0)
      };
    };

    res.json({
      thisWeek: getWeekData(0),
      lastWeek: getWeekData(1)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/meetings - meetings for a given month
app.get('/api/calendar/meetings', async (req, res) => {
  try {
    const db = await getDb();
    const { month } = req.query; // format: YYYY-MM
    if (!month) return res.status(400).json({ error: 'month param required (YYYY-MM)' });

    // Get leads with meeting_date in this month
    const meetResult = db.exec(`
      SELECT id, name, city, phone1, category, subcategory, meeting_date, meeting_notes, outreach_status, call_date
      FROM leads WHERE meeting_date IS NOT NULL AND meeting_date LIKE ?
    `, [`${month}%`]);

    // Also get leads with call_date in this month (but no meeting that month)
    const callResult = db.exec(`
      SELECT id, name, city, phone1, category, subcategory, meeting_date, meeting_notes, outreach_status, call_date
      FROM leads WHERE call_date IS NOT NULL AND call_date LIKE ?
      AND (meeting_date IS NULL OR meeting_date NOT LIKE ?)
    `, [`${month}%`, `${month}%`]);

    const parseRows = (result) => {
      if (!result.length) return [];
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    };

    const meetings = parseRows(meetResult);
    const calls = parseRows(callResult).map(r => ({ ...r, _type: 'call' }));
    res.json([...meetings, ...calls]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/followups - leads needing follow-up
app.get('/api/calendar/followups', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`
      SELECT id, name, city, phone1, category, call_date, outreach_status,
        CAST(julianday('now') - julianday(call_date) AS INTEGER) as days_since_call
      FROM leads
      WHERE outreach_status = 'called' AND call_date IS NOT NULL
      AND julianday('now') - julianday(call_date) >= 3
      ORDER BY call_date ASC
    `);

    if (!result.length) return res.json([]);
    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/weekly-report - full weekly report data
app.get('/api/stats/weekly-report', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();

    const total = db.exec('SELECT COUNT(*) FROM leads')[0].values[0][0];
    const byCategory = {};
    const catResult = db.exec('SELECT category, COUNT(*) FROM leads GROUP BY category');
    if (catResult.length) catResult[0].values.forEach(([c, n]) => { byCategory[c] = n; });

    const byStatus = {};
    const statResult = db.exec('SELECT outreach_status, COUNT(*) FROM leads GROUP BY outreach_status');
    if (statResult.length) statResult[0].values.forEach(([s, n]) => { byStatus[s] = n; });

    // This week's activity
    const thisWeekActivity = db.exec(`
      SELECT action, COUNT(*) FROM activity_log
      WHERE created_at >= date('now', 'weekday 0', '-6 days')
      GROUP BY action
    `);
    const weekActivity = {};
    if (thisWeekActivity.length) thisWeekActivity[0].values.forEach(([a, c]) => { weekActivity[a] = c; });

    // Top cities
    const citiesResult = db.exec(`SELECT city, COUNT(*) as cnt FROM leads WHERE city IS NOT NULL AND city != '' GROUP BY city ORDER BY cnt DESC LIMIT 10`);
    const topCities = citiesResult.length ? citiesResult[0].values.map(([city, cnt]) => ({ city, cnt })) : [];

    res.json({ total, byCategory, byStatus, weekActivity, topCities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CUSTOMERS (B2C walk-in buyers) — separate from leads (B2B)
// ============================================================
// NOTE: /customers/stats and /customers/export.csv MUST be registered
// BEFORE /customers/:id, otherwise Express matches :id first.

// GET /api/customers/stats - dashboard stats for customers
app.get('/api/customers/stats', async (req, res) => {
  try {
    const db = await getDb();

    const totalR = db.exec('SELECT COUNT(*) FROM customers');
    const total = totalR.length ? totalR[0].values[0][0] : 0;

    const withEmailR = db.exec("SELECT COUNT(*) FROM customers WHERE email IS NOT NULL AND email != ''");
    const withEmail = withEmailR.length ? withEmailR[0].values[0][0] : 0;

    const withConsentR = db.exec("SELECT COUNT(*) FROM customers WHERE marketing_consent = 1 AND email IS NOT NULL AND email != ''");
    const withConsent = withConsentR.length ? withConsentR[0].values[0][0] : 0;

    const thisMonthR = db.exec("SELECT COUNT(*) FROM customers WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");
    const thisMonth = thisMonthR.length ? thisMonthR[0].values[0][0] : 0;

    const byCityR = db.exec("SELECT city, COUNT(*) as cnt FROM customers WHERE city IS NOT NULL AND city != '' GROUP BY city ORDER BY cnt DESC LIMIT 10");
    const byCity = byCityR.length ? byCityR[0].values.map(([city, cnt]) => ({ city, cnt })) : [];

    res.json({ total, withEmail, withConsent, thisMonth, byCity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/export.csv - CSV export (for email tools)
app.get('/api/customers/export.csv', async (req, res) => {
  try {
    const db = await getDb();
    const { consent_only } = req.query;

    let sql = 'SELECT id, name, phone, email, city, purchase_date, products, purchase_value, marketing_consent, consent_date, created_at FROM customers';
    const params = [];
    if (consent_only === '1') {
      sql += " WHERE marketing_consent = 1 AND email IS NOT NULL AND email != ''";
    }
    sql += ' ORDER BY created_at DESC';

    const result = db.exec(sql, params);
    const rows = result.length ? result[0].values : [];
    const columns = result.length ? result[0].columns : ['id','name','phone','email','city','purchase_date','products','purchase_value','marketing_consent','consent_date','created_at'];

    // Proper CSV escaping: wrap in quotes, double internal quotes
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const lines = [columns.join(',')];
    for (const row of rows) {
      lines.push(row.map(esc).join(','));
    }
    const csv = '\ufeff' + lines.join('\r\n'); // BOM for Excel UTF-8

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="enza-kupci-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers - list with filters
app.get('/api/customers', async (req, res) => {
  try {
    const db = await getDb();
    const { search, city, has_email, has_consent, from_date, to_date } = req.query;

    const where = ['1=1'];
    const params = [];

    if (search) {
      where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR products LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (city) {
      where.push('city LIKE ?');
      params.push(`%${city}%`);
    }
    if (has_email === '1') {
      where.push("email IS NOT NULL AND email != ''");
    } else if (has_email === '0') {
      where.push("(email IS NULL OR email = '')");
    }
    if (has_consent === '1') {
      where.push('marketing_consent = 1');
    } else if (has_consent === '0') {
      where.push('marketing_consent = 0');
    }
    if (from_date) {
      where.push('purchase_date >= ?');
      params.push(from_date);
    }
    if (to_date) {
      where.push('purchase_date <= ?');
      params.push(to_date);
    }

    const sql = `
      SELECT c.*, u.display_name as created_by_name, u.username as created_by_username
      FROM customers c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE ${where.join(' AND ')}
      ORDER BY c.created_at DESC
    `;

    const result = db.exec(sql, params);
    if (!result.length) return res.json([]);

    const columns = result[0].columns;
    const rows = result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json(rows);
  } catch (err) {
    console.error('GET /api/customers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
app.get('/api/customers/:id', async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const result = db.exec(`
      SELECT c.*, u.display_name as created_by_name, u.username as created_by_username
      FROM customers c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ?
    `, [id]);
    if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });

    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => { obj[col] = result[0].values[0][i]; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers - create
app.post('/api/customers', async (req, res) => {
  try {
    const db = await getDb();
    const f = req.body || {};

    if (!f.name || typeof f.name !== 'string' || !f.name.trim()) {
      return res.status(400).json({ error: 'Ime kupca je obavezno' });
    }

    const consent = Number(f.marketing_consent) === 1 ? 1 : 0;
    // Auto-set consent_date when consent is given on create
    const consentDate = consent === 1 ? (f.consent_date || new Date().toISOString().slice(0, 10)) : null;

    const n = (v) => (v === undefined || v === '' ? null : v);

    db.run(`
      INSERT INTO customers (name, phone, email, city, address, purchase_date, products, purchase_value, notes, marketing_consent, consent_date, source, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      f.name.trim(),
      n(f.phone),
      n(f.email),
      n(f.city),
      n(f.address),
      n(f.purchase_date),
      n(f.products),
      n(f.purchase_value),
      n(f.notes),
      consent,
      consentDate,
      n(f.source) || 'store',
      req.user.id,
    ]);

    const idResult = db.exec('SELECT last_insert_rowid()');
    const newId = idResult[0].values[0][0];
    saveDb();
    res.json({ success: true, id: newId });
  } catch (err) {
    console.error('POST /api/customers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id - update
app.put('/api/customers/:id', async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const fields = req.body || {};

    // Fetch existing row to compare consent toggle
    const oldR = db.exec('SELECT * FROM customers WHERE id = ?', [id]);
    if (!oldR.length || !oldR[0].values.length) return res.status(404).json({ error: 'Not found' });
    const oldCustomer = {};
    oldR[0].columns.forEach((col, i) => { oldCustomer[col] = oldR[0].values[0][i]; });

    const allowedFields = [
      'name', 'phone', 'email', 'city', 'address',
      'purchase_date', 'products', 'purchase_value', 'notes',
      'marketing_consent', 'source'
    ];

    const sets = [];
    const params = [];
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        sets.push(`${key} = ?`);
        params.push(value === '' ? null : value);
      }
    }

    // Handle consent_date automatically based on consent toggle
    if (fields.marketing_consent !== undefined) {
      const newConsent = Number(fields.marketing_consent) === 1 ? 1 : 0;
      const oldConsent = Number(oldCustomer.marketing_consent) === 1 ? 1 : 0;
      if (newConsent === 1 && oldConsent === 0) {
        // First time giving consent → stamp today
        sets.push('consent_date = ?');
        params.push(new Date().toISOString().slice(0, 10));
      } else if (newConsent === 0 && oldConsent === 1) {
        // Consent withdrawn → clear date
        sets.push('consent_date = NULL');
      }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No valid fields' });

    sets.push("updated_at = datetime('now')");
    params.push(id);

    db.run(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`, params);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/customers/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    db.run('DELETE FROM customers WHERE id = ?', [id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Enza Lead Database server running on http://localhost:${PORT}`);
});
