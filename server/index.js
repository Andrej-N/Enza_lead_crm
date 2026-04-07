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
function authRequired(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Niste prijavljeni' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Sesija je istekla, prijavite se ponovo' });
  }
}

// --- Auth endpoints (public) ---

// POST /api/auth/login
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username i password su obavezni' });

    const result = db.exec('SELECT id, username, password_hash, display_name FROM users WHERE username = ?', [username]);
    if (!result.length || !result[0].values.length) {
      // Track failed attempt
      const ip = req.ip;
      if (!loginAttempts.has(ip)) loginAttempts.set(ip, { attempts: [] });
      loginAttempts.get(ip).attempts.push(Date.now());
      return res.status(401).json({ error: 'Pogresan username ili password' });
    }

    const [id, uname, hash, displayName] = result[0].values[0];
    const valid = bcrypt.compareSync(password, hash);
    if (!valid) {
      const ip = req.ip;
      if (!loginAttempts.has(ip)) loginAttempts.set(ip, { attempts: [] });
      loginAttempts.get(ip).attempts.push(Date.now());
      return res.status(401).json({ error: 'Pogresan username ili password' });
    }

    const token = jwt.sign({ id, username: uname, displayName }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ success: true, user: { id, username: uname, displayName } });
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
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: decoded.id, username: decoded.username, displayName: decoded.displayName } });
  } catch (err) {
    res.clearCookie('token');
    res.status(401).json({ error: 'Invalid token' });
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
    const { category, subcategory, outreach_status, search, investor_size, construction_phase, city, has_phone, has_email, verified } = req.query;

    let where = ['1=1'];
    let params = [];

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

    const sql = `SELECT * FROM leads WHERE ${where.join(' AND ')} ORDER BY
      CASE outreach_status
        WHEN 'meeting_scheduled' THEN 1
        WHEN 'negotiation' THEN 2
        WHEN 'called' THEN 3
        WHEN 'not_contacted' THEN 4
        WHEN 'deal_closed' THEN 5
        WHEN 'not_interested' THEN 6
      END, name ASC`;

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
    const result = db.exec('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'Not found' });

    const columns = result[0].columns;
    const obj = {};
    columns.forEach((col, i) => { obj[col] = result[0].values[0][i]; });
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

    // Log activity for various field changes
    if (fields.outreach_status) {
      db.run('INSERT INTO activity_log (lead_id, action, details, action_type) VALUES (?, ?, ?, ?)', [
        id, 'status_change', `Status promenjen u: ${fields.outreach_status}`, 'system'
      ]);
    }
    if (fields.call_date) {
      db.run('INSERT INTO activity_log (lead_id, action, details, action_type) VALUES (?, ?, ?, ?)', [
        id, 'call_logged', `Poziv zakazan: ${fields.call_date}`, 'call'
      ]);
    }
    if (fields.meeting_date) {
      db.run('INSERT INTO activity_log (lead_id, action, details, action_type) VALUES (?, ?, ?, ?)', [
        id, 'meeting_scheduled', `Sastanak zakazan: ${fields.meeting_date}`, 'meeting'
      ]);
    }
    saveDb();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads - create new lead
app.post('/api/leads', async (req, res) => {
  try {
    const db = await getDb();
    const f = req.body;
    const n = (v) => v === undefined ? null : v;

    db.run(`INSERT INTO leads (category, subcategory, name, city, address, website,
      phone1, phone2, email, email2, contact_person, stars, num_rooms, google_rating,
      clinic_type, has_stationary, has_surgery, has_maternity, has_palliative, num_beds,
      relevance, project_name, area_sqm, num_apartments, construction_phase, investor_size,
      investment_eur, opening_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      n(f.category), n(f.subcategory), n(f.name), n(f.city), n(f.address), n(f.website),
      n(f.phone1), n(f.phone2), n(f.email), n(f.email2), n(f.contact_person), n(f.stars), n(f.num_rooms), n(f.google_rating),
      n(f.clinic_type), f.has_stationary || 0, f.has_surgery || 0, f.has_maternity || 0, f.has_palliative || 0,
      n(f.num_beds), n(f.relevance), n(f.project_name), n(f.area_sqm), n(f.num_apartments),
      n(f.construction_phase), n(f.investor_size), n(f.investment_eur), n(f.opening_date), n(f.notes)
    ]);
    saveDb();

    const result = db.exec('SELECT last_insert_rowid()');
    const newId = result[0].values[0][0];
    res.json({ success: true, id: newId });
  } catch (err) {
    console.error('POST /api/leads error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id
app.delete('/api/leads/:id', async (req, res) => {
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
app.get('/api/stats', async (req, res) => {
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

// GET /api/activity/:leadId - activity log
app.get('/api/activity/:leadId', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM activity_log WHERE lead_id = ? ORDER BY created_at DESC', [req.params.leadId]);
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
    db.run('INSERT INTO activity_log (lead_id, action, details, action_type) VALUES (?, ?, ?, ?)', [
      req.params.leadId, action || 'Beleska', details || '', action_type || 'note'
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

// GET /api/stats/pipeline - funnel data
app.get('/api/stats/pipeline', async (req, res) => {
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
app.get('/api/stats/cities', async (req, res) => {
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
app.get('/api/stats/conversion', async (req, res) => {
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
app.get('/api/stats/weekly-activity', async (req, res) => {
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
app.get('/api/stats/weekly-summary', async (req, res) => {
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
app.get('/api/stats/weekly-report', async (req, res) => {
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

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Enza Lead Database server running on http://localhost:${PORT}`);
});
