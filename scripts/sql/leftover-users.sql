-- Active (not deleted) e2e accounts from this run; should be 0 after cleanup.
SELECT count(*) FROM users
 WHERE deleted_at IS NULL AND email LIKE 'e2e-%' || :'run_id' || '@example.test';
