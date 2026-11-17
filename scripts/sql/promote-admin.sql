-- Gives the run's dedicated e2e admin account (created through the API a
-- moment earlier) the admin role, so the CMS test can log in. Touches exactly
-- that one row; the account is deleted through the API at the end of the run.
UPDATE users SET role = 'admin'
 WHERE email = :'email' AND deleted_at IS NULL AND email LIKE 'e2e-admin-%@example.test'
RETURNING id;
