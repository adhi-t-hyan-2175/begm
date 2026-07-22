# 🔄 RECOVERY & BACKUP

The BETX platform uses **Supabase** for its database layer, which greatly simplifies disaster recovery.

## 1. Backups (Supabase)
Supabase automatically manages backups for you:
- **Free/Pro Plan:** Automated daily backups are created.
- **Point-In-Time Recovery (PITR):** Available on Pro/Enterprise plans, allowing you to restore the database to any specific second in the past (up to your retention limit).

> [!TIP]
> You do NOT need custom `pg_dump` cron scripts. Rely on the Supabase dashboard to manage backups reliably.

## 2. Disaster Recovery Workflow (Database Rollback)

If a critical failure corrupts the database:
1. Open the **Supabase Dashboard** for your project.
2. Navigate to **Database > Backups**.
3. Select **Restore to a specific point in time** (if PITR is enabled) or choose the most recent daily backup.
4. **Warning:** Restoring the database will pause the project temporarily. Wait for the restoration to complete.
5. Restart your backend server (`pm2 restart betx-backend`) so the `GameEngine` can re-initialize the `global_game_state` using the current `EPOCH` time.

## 3. Applying Schema Changes (Migrations)
If you need to move to a fresh Supabase project or recreate the schema:
1. Run `supabase_production_migration.sql` to initialize tables, RLS policies, and triggers.
2. Run `supabase_round_id_indexes.sql` to apply the optimized indexes for `round_id`.
3. Re-seed any required admin users or game configurations.
