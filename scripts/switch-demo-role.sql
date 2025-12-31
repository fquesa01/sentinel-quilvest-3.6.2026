-- Quick Role Switcher for Testing
-- Copy and paste the relevant section to switch your account role

-- ==================================================
-- SWITCH TO ADMIN ROLE
-- ==================================================
-- Run this to give yourself full admin access
UPDATE users 
SET role = 'admin' 
WHERE email = 'YOUR_EMAIL@example.com';

-- ==================================================
-- SWITCH TO COMPLIANCE OFFICER ROLE
-- ==================================================
-- Run this to test compliance officer features (Admin Dashboard access)
UPDATE users 
SET role = 'compliance_officer' 
WHERE email = 'YOUR_EMAIL@example.com';

-- ==================================================
-- SWITCH TO ATTORNEY ROLE
-- ==================================================
-- Run this to test attorney review queue features
UPDATE users 
SET role = 'attorney' 
WHERE email = 'YOUR_EMAIL@example.com';

-- ==================================================
-- CHECK YOUR CURRENT ROLE
-- ==================================================
-- Run this to see your current role
SELECT id, email, first_name, last_name, role, created_at 
FROM users 
WHERE email = 'YOUR_EMAIL@example.com';

-- ==================================================
-- LIST ALL DEMO ACCOUNTS
-- ==================================================
-- Run this to see all available demo accounts
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE id LIKE 'demo-%' 
ORDER BY role;
