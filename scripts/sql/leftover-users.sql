-- Active (not deleted) e2e accounts from this run; should be 0 after cleanup.
-- Matches the runner's accounts (e2e-user-<run>@...) and the ones the tests
-- sign up themselves (e2e-<label>-<run>-<n>@...).
SELECT count(*) FROM users
 WHERE deleted_at IS NULL AND email LIKE 'e2e-%' || :'run_id' || '%@example.test';
