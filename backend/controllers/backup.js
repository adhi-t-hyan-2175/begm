const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, '../../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ─── GET /api/admin/backups ───────────────────────────────────────────────────
exports.getBackups = (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
    const backups = files.map(file => {
      const stats = fs.statSync(path.join(BACKUP_DIR, file));
      return {
        name: file,
        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
        date: stats.birthtime,
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/backups/create ──────────────────────────────────────────
exports.createBackup = (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ success: false, error: 'DATABASE_URL not configured in backend/.env' });
  }

  const filename = `backup-${Date.now()}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  const command = `pg_dump "${dbUrl}" -F c -f "${filepath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('[Backup Error]', stderr);
      return res.status(500).json({ success: false, error: 'Backup failed' });
    }
    res.json({ success: true, message: 'Backup created successfully', filename });
  });
};

// ─── DELETE /api/admin/backups/:name ─────────────────────────────────────────
exports.deleteBackup = (req, res) => {
  try {
    const { name } = req.params;
    const filepath = path.join(BACKUP_DIR, name);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
