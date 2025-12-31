# Sentinel Counsel Demo Data Guide

## 🎉 Overview

Comprehensive demo data has been seeded into your Sentinel Counsel platform, covering all major compliance investigation workflows. This guide explains what data is available and how to explore it.

## 📊 Seeded Data Summary

### ✅ Successfully Seeded Sections

| Section | Count | Description |
|---------|-------|-------------|
| **📧 Communications** | 6 | Flagged emails and SMS messages containing compliance violations |
| **🚨 Alerts** | 3 | High-risk compliance alerts (FCPA, Antitrust, SOX) |
| **📁 Cases** | 3 | Active compliance investigations with full details |
| **👥 Demo Users** | 3 | Pre-configured accounts for testing different roles |

---

## 📧 Communications Demo Data

### FCPA Bribery Email Chain (2 messages)
**Violation Type:** FCPA - Foreign Corrupt Practices Act  
**Severity:** Critical  
**Red Flags:** Third-party intermediary, concealment language, false invoicing

**Email 1: "Re: Singapore Contract - Urgent"**
- **From:** sarah.chen@globalcorp.com
- **To:** tom.williams@globalcorp.com
- **Date:** October 15, 2025
- **Content:** Discusses $75,000 "consulting fee" to expedite contract approval through Malaysian intermediary

**Email 2: Response confirming wire transfer**
- **From:** tom.williams@globalcorp.com
- **To:** sarah.chen@globalcorp.com
- **Date:** October 16, 2025
- **Content:** Confirms wire transfer processed, instructs to delete email

### Antitrust Price Fixing SMS Chain (2 messages)
**Violation Type:** Antitrust - Sherman Act Section 1  
**Severity:** Critical  
**Red Flags:** Price coordination, market allocation, competitor communications

**SMS 1:** Discusses pricing strategy coordination with competitors
**SMS 2:** Confirms cartel arrangement to raise prices and divide territories

### SOX Revenue Recognition Email
**Violation Type:** SOX Section 404 - Internal Controls  
**Severity:** High  
**Red Flags:** Management override, earnings manipulation

**From:** j.martinez@techcorp.com (Controller)  
**Content:** Expresses concerns about CFO directing improper revenue recognition to meet quarterly targets

### Insider Trading SMS
**Violation Type:** Securities Fraud  
**Severity:** Critical  
**Content:** Tip about merger falling apart, instructions to sell shares before public announcement

---

## 🚨 Alerts Demo Data

### Alert 1: FCPA Violation Detection
- **Risk Score:** 95/100 (Critical)
- **Status:** Under Review
- **Flagged Keywords:** "consulting fee", "expedite", "off the radar", "market research services"
- **AI Analysis:** High-risk FCPA violation with classic red flags
- **Recommendation:** Immediate legal hold and investigation

### Alert 2: Antitrust Violation Detection
- **Risk Score:** 92/100 (Critical)
- **Status:** Escalated
- **Flagged Keywords:** "match our increase", "stay out of territory", "pricing strategy"
- **AI Analysis:** Sherman Act Section 1 per se violation
- **Recommendation:** Immediate investigation, potential DOJ self-disclosure

### Alert 3: SOX Violation Detection
- **Risk Score:** 85/100 (High)
- **Status:** New
- **Flagged Keywords:** "revenue recognition", "Q3 even though", "Q4", "make it work"
- **AI Analysis:** SOX 404 internal controls violation
- **Recommendation:** Controller interview, CFO investigation

---

## 📁 Cases Demo Data

### Case 1: FCPA Investigation - Singapore Infrastructure Bribery
**Case Number:** CASE-2025-0001  
**Status:** Investigation  
**Priority:** Critical  
**Risk Score:** 95/100

**Key Details:**
- **Employee:** Sarah Chen, VP Business Development
- **Violation:** Payments to Singapore government officials through Malaysian intermediary
- **Evidence:** Email chain documenting $75,000 consulting fee arrangement
- **Legal Hold:** Active
- **Attorney-Client Privilege:** Yes (Counsel-directed investigation)
- **Potential Penalties:** $2M+ fines, criminal prosecution

**Investigation Focus:**
- Third-party due diligence on "Lee Consulting Services Malaysia"
- Transaction forensics on $75,000 wire transfer
- Employee interviews (Sarah Chen, Tom Williams)
- Remediation: Enhanced FCPA compliance program

### Case 2: Antitrust Investigation - Price Fixing Cartel
**Case Number:** CASE-2025-0002  
**Status:** Investigation  
**Priority:** Critical  
**Risk Score:** 92/100

**Key Details:**
- **Employee:** Michael Roberts, Sales Director
- **Violation:** Horizontal price fixing and market allocation with competitors
- **Evidence:** SMS messages documenting cartel arrangement
- **Competitors:** Acme Corp, Widget Industries
- **Potential Penalties:** Treble damages, criminal prosecution, individual jail time

**Investigation Focus:**
- Document all competitor communications (2023-2025)
- Interview sales team members
- Pricing analysis to determine customer impact
- DOJ leniency application evaluation

### Case 3: SOX Investigation - Revenue Recognition Manipulation
**Case Number:** CASE-2025-0003  
**Status:** Alert Review  
**Priority:** High  
**Risk Score:** 85/100

**Key Details:**
- **Employee:** Jennifer Martinez, Controller
- **Violation:** Improper revenue recognition directed by CFO
- **Evidence:** Email expressing concerns about control override
- **Amount:** $2.3M contract recognized prematurely
- **Potential Impact:** Financial restatement, SEC enforcement action

**Investigation Focus:**
- Revenue recognition forensics (Q3/Q4 2025)
- Interview Controller and CFO
- Review internal controls procedures
- Assess materiality and disclosure requirements

---

## 👥 Demo User Accounts

Three pre-configured demo accounts are available for testing different permission levels:

### Admin Account
- **Email:** demo.admin@sentinelcounsel.com
- **Role:** Admin
- **Access:** Full system access, user management, all dashboards

### Compliance Officer Account
- **Email:** demo.officer@sentinelcounsel.com
- **Role:** Compliance Officer
- **Access:** Admin Dashboard, investigation management, case assignment

### Attorney Account
- **Email:** demo.attorney@sentinelcounsel.com
- **Role:** Attorney
- **Access:** Attorney review queue, privilege review, case analysis

---

## 🚀 How to Use Demo Data

### Option 1: Use Demo Accounts Directly
The demo accounts are ready to use immediately:
1. Log in with Replit Auth using your Replit account
2. Update your role in the database to test different permissions:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

### Option 2: Switch Your Account Role
You can switch between roles to test different features:

```sql
-- Become Admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- Become Compliance Officer
UPDATE users SET role = 'compliance_officer' WHERE email = 'your-email@example.com';

-- Become Attorney
UPDATE users SET role = 'attorney' WHERE email = 'your-email@example.com';
```

### Option 3: View Demo Data Directly
You can query the demo data directly:

```sql
-- View all demo cases
SELECT * FROM cases WHERE case_number LIKE 'CASE-2025-%';

-- View all demo alerts
SELECT * FROM alerts WHERE risk_score >= 85 ORDER BY risk_score DESC;

-- View all demo communications
SELECT * FROM communications 
WHERE sender LIKE '%@globalcorp.com' OR sender LIKE '%@techcorp.com'
ORDER BY timestamp DESC;
```

---

## 🔄 Re-seeding Demo Data

If you need to refresh the demo data:

```bash
tsx server/seed-core-demo-data.ts
```

This script will:
1. Clean up existing demo data (communications, alerts, cases)
2. Seed fresh data with realistic compliance violation scenarios
3. Link all data together (communications → alerts → cases)

---

## 📝 Available Roles

The platform supports 7 distinct roles with varying permissions:

| Role | Access Level | Use Case |
|------|--------------|----------|
| **admin** | Full system access | System administration, user management |
| **compliance_officer** | Investigation management | Case assignment, alert review, dashboard access |
| **attorney** | Legal review | Attorney-client privilege, work product review |
| **external_counsel** | Outside counsel access | Case collaboration, document review |
| **auditor** | Audit and review | Compliance audits, reporting |
| **employee** | Basic portal access | Policy acknowledgment, training |
| **vendor** | Vendor management | Risk assessments, due diligence |

---

## 📊 Demo Data Scenarios

### Scenario 1: FCPA Investigation Workflow
1. **Navigate to Communications** → See flagged Singapore Contract emails
2. **Navigate to Alerts** → Review FCPA alert with AI analysis
3. **Navigate to Cases** → Open CASE-2025-0001 investigation
4. **Review Evidence** → Email chain with bribery red flags
5. **Assign Investigators** → (Admin/Compliance Officer only)
6. **Legal Hold Management** → Active legal hold on all evidence

### Scenario 2: Antitrust Investigation Workflow
1. **Navigate to Communications** → See price-fixing SMS messages
2. **Navigate to Alerts** → Review Antitrust alert (Risk Score: 92)
3. **Navigate to Cases** → Open CASE-2025-0002
4. **Attorney Review** → (Attorney role) Review privilege status
5. **Remediation Planning** → Antitrust compliance overhaul

### Scenario 3: SOX Internal Controls Review
1. **Navigate to Alerts** → See SOX revenue recognition alert
2. **Navigate to Cases** → Open CASE-2025-0003
3. **Review Email Evidence** → Controller's concerns about CFO directive
4. **Compliance Assessment** → Evaluate internal controls breakdown

---

## 🛠 Troubleshooting

### No Data Visible
1. Ensure you're logged in with proper role permissions
2. Check that demo data was seeded: `tsx server/seed-core-demo-data.ts`
3. Verify database connection: Check DATABASE_URL environment variable

### Permission Issues
1. Update your user role in the database (see "How to Use Demo Data" above)
2. Log out and log back in to refresh permissions
3. Check role-based access control settings

### Data Conflicts
If you see duplicate key errors when re-seeding:
1. The cleanup script should handle this automatically
2. Manually delete demo data if needed:
   ```sql
   DELETE FROM cases WHERE case_number LIKE 'CASE-2025-%';
   DELETE FROM alerts WHERE created_at > NOW() - INTERVAL '2 days';
   DELETE FROM communications WHERE sender LIKE '%@globalcorp.com';
   ```

---

## 📞 Next Steps

1. **Explore the Platform:** Log in and navigate through Communications, Alerts, and Cases
2. **Test Workflows:** Create new cases, assign investigators, update statuses
3. **Try Different Roles:** Switch between admin, compliance_officer, and attorney roles
4. **Add More Data:** Use the seeding scripts as templates to create additional scenarios
5. **Customize:** Modify the demo data to match your specific compliance use cases

---

## 🎯 Demo Data Use Cases

This demo data is perfect for:
- **Product Demonstrations:** Show clients realistic compliance investigation workflows
- **Training:** Onboard compliance teams with real-world violation scenarios
- **Testing:** Validate platform features with comprehensive data
- **Development:** Test new features against realistic datasets

---

**Questions or Issues?** Check the main documentation in `replit.md` or examine the seeding script at `server/seed-core-demo-data.ts`.
