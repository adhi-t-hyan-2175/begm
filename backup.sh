# ─────────────────────────────────────────────────────────────
# SUPABASE DATABASE BACKUP SCRIPT
# ─────────────────────────────────────────────────────────────
# Supabase provides automatic daily backups for free accounts.
# For Pro accounts, it provides Point-in-Time Recovery (PITR).
#
# If you want to take manual backups, you can use `pg_dump`
# which comes with PostgreSQL client tools.
# ─────────────────────────────────────────────────────────────

# 1. Get your database connection string from:
#    Supabase Dashboard -> Settings -> Database -> Connection string -> URI

# 2. Run this command in your terminal (replace YOUR_DB_URL):
# pg_dump "postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -F c -f gambb_backup_$(date +%F).dump

# 3. To restore the backup:
# pg_restore -d "YOUR_DB_URL" -1 gambb_backup_2026-07-11.dump

echo "This is a documentation file. Run the pg_dump command manually to backup."
