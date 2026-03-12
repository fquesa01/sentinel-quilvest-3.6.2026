-- Add representation_role column to deals table
-- Values: buyer, seller, lender, borrower, investor, investee
ALTER TABLE deals ADD COLUMN IF NOT EXISTS representation_role VARCHAR(50);
