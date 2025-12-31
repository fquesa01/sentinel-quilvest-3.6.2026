import { db } from "./db";
import * as schema from "@shared/schema";

export async function seedMonitoringData() {
  console.log("📊 Seeding Employees...");
  
  const employees = await db.insert(schema.employees).values([
    {
      employeeNumber: "EMP-2023-0001",
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah.chen@sentinelcounsel.com",
      department: "Finance",
      position: "Chief Financial Officer",
      hireDate: new Date("2021-03-15"),
      location: "New York, NY",
      manager: "CEO",
      complianceScore: 92,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0002",
      firstName: "Michael",
      lastName: "Rodriguez",
      email: "michael.rodriguez@sentinelcounsel.com",
      department: "Sales",
      position: "VP of Sales",
      hireDate: new Date("2020-06-01"),
      location: "San Francisco, CA",
      manager: "CRO",
      complianceScore: 78,
      riskLevel: "medium",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0003",
      firstName: "Jennifer",
      lastName: "Kim",
      email: "jennifer.kim@sentinelcounsel.com",
      department: "Legal",
      position: "Senior Counsel",
      hireDate: new Date("2019-09-10"),
      location: "New York, NY",
      manager: "General Counsel",
      complianceScore: 96,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0004",
      firstName: "David",
      lastName: "Thompson",
      email: "david.thompson@sentinelcounsel.com",
      department: "Operations",
      position: "Director of Operations",
      hireDate: new Date("2022-01-15"),
      location: "Chicago, IL",
      manager: "COO",
      complianceScore: 88,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0005",
      firstName: "Emily",
      lastName: "Patel",
      email: "emily.patel@sentinelcounsel.com",
      department: "Engineering",
      position: "Senior Software Engineer",
      hireDate: new Date("2021-11-01"),
      location: "Austin, TX",
      manager: "VP Engineering",
      complianceScore: 94,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0006",
      firstName: "Robert",
      lastName: "Williams",
      email: "robert.williams@sentinelcounsel.com",
      department: "Sales",
      position: "Account Executive",
      hireDate: new Date("2023-03-20"),
      location: "Los Angeles, CA",
      manager: "VP of Sales",
      complianceScore: 65,
      riskLevel: "high",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0007",
      firstName: "Amanda",
      lastName: "Martinez",
      email: "amanda.martinez@sentinelcounsel.com",
      department: "Compliance",
      position: "Compliance Officer",
      hireDate: new Date("2020-08-15"),
      location: "New York, NY",
      manager: "Chief Compliance Officer",
      complianceScore: 98,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0008",
      firstName: "James",
      lastName: "Brown",
      email: "james.brown@sentinelcounsel.com",
      department: "Finance",
      position: "Controller",
      hireDate: new Date("2021-05-01"),
      location: "New York, NY",
      manager: "CFO",
      complianceScore: 91,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0009",
      firstName: "Lisa",
      lastName: "Anderson",
      email: "lisa.anderson@sentinelcounsel.com",
      department: "Marketing",
      position: "Director of Marketing",
      hireDate: new Date("2022-07-10"),
      location: "Seattle, WA",
      manager: "CMO",
      complianceScore: 85,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      employeeNumber: "EMP-2023-0010",
      firstName: "Thomas",
      lastName: "Lee",
      email: "thomas.lee@sentinelcounsel.com",
      department: "Sales",
      position: "Sales Representative",
      hireDate: new Date("2023-06-01"),
      location: "Boston, MA",
      manager: "VP of Sales",
      complianceScore: 72,
      riskLevel: "medium",
      lastActivityDate: new Date(),
    },
  ]).returning();
  
  console.log(`✓ Seeded ${employees.length} employees`);

  console.log("\n👔 Seeding Vendor Contacts...");
  
  const vendorContacts = await db.insert(schema.vendorContacts).values([
    {
      contactNumber: "VEN-2023-0001",
      firstName: "Alex",
      lastName: "Morrison",
      email: "alex.morrison@techsolutions.com",
      companyName: "TechSolutions Inc",
      vendorType: "IT",
      position: "Account Manager",
      phone: "+1-415-555-0101",
      location: "San Francisco, CA",
      complianceScore: 88,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      contactNumber: "VEN-2023-0002",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.garcia@legaladvisors.com",
      companyName: "Legal Advisors LLP",
      vendorType: "Legal",
      position: "Partner",
      phone: "+1-212-555-0102",
      location: "New York, NY",
      complianceScore: 95,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      contactNumber: "VEN-2023-0003",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@consulting.com",
      companyName: "Strategic Consulting Group",
      vendorType: "Consulting",
      position: "Senior Consultant",
      phone: "+1-617-555-0103",
      location: "Boston, MA",
      complianceScore: 76,
      riskLevel: "medium",
      lastActivityDate: new Date(),
    },
    {
      contactNumber: "VEN-2023-0004",
      firstName: "Rachel",
      lastName: "Wong",
      email: "rachel.wong@accountingpros.com",
      companyName: "Accounting Professionals",
      vendorType: "Accounting",
      position: "Director",
      phone: "+1-312-555-0104",
      location: "Chicago, IL",
      complianceScore: 92,
      riskLevel: "low",
      lastActivityDate: new Date(),
    },
    {
      contactNumber: "VEN-2023-0005",
      firstName: "David",
      lastName: "Park",
      email: "david.park@itservices.com",
      companyName: "IT Services Corp",
      vendorType: "IT",
      position: "Technical Lead",
      phone: "+1-408-555-0105",
      location: "San Jose, CA",
      complianceScore: 68,
      riskLevel: "high",
      lastActivityDate: new Date(),
    },
  ]).returning();
  
  console.log(`✓ Seeded ${vendorContacts.length} vendor contacts`);

  console.log("\n📱 Seeding Monitored Devices...");
  
  const devices = [];
  for (const emp of employees) {
    devices.push(
      {
        personType: "employee",
        personId: emp.id,
        deviceType: "mobile_phone" as const,
        deviceName: "iPhone 14 Pro",
        serialNumber: `APPLE-${Math.random().toString(36).substring(7).toUpperCase()}`,
        platform: "iOS",
        osVersion: "17.2",
        lastSyncDate: new Date(),
        status: "active",
      },
      {
        personType: "employee",
        personId: emp.id,
        deviceType: "laptop" as const,
        deviceName: "MacBook Pro 16\"",
        serialNumber: `APPLE-${Math.random().toString(36).substring(7).toUpperCase()}`,
        platform: "macOS",
        osVersion: "14.2",
        lastSyncDate: new Date(),
        status: "active",
      }
    );
  }
  
  for (const vendor of vendorContacts) {
    devices.push(
      {
        personType: "vendor",
        personId: vendor.id,
        deviceType: "mobile_phone" as const,
        deviceName: "Samsung Galaxy S23",
        serialNumber: `SAMSUNG-${Math.random().toString(36).substring(7).toUpperCase()}`,
        platform: "Android",
        osVersion: "13.0",
        lastSyncDate: new Date(),
        status: "active",
      }
    );
  }
  
  await db.insert(schema.monitoredDevices).values(devices);
  console.log(`✓ Seeded ${devices.length} monitored devices`);

  console.log("\n📁 Seeding Folder Access...");
  
  const folders = [];
  for (const emp of employees) {
    folders.push(
      {
        personType: "employee",
        personId: emp.id,
        platform: "onedrive" as const,
        folderPath: `/users/${emp.email}/Documents`,
        permissions: "read-write",
        dataVolumeMb: Math.floor(Math.random() * 5000) + 500,
        lastAccessDate: new Date(),
      },
      {
        personType: "employee",
        personId: emp.id,
        platform: "sharepoint" as const,
        folderPath: `/sites/${emp.department}/Shared Documents`,
        permissions: "read",
        dataVolumeMb: Math.floor(Math.random() * 3000) + 200,
        lastAccessDate: new Date(),
      },
      {
        personType: "employee",
        personId: emp.id,
        platform: "employee_agreements" as const,
        folderPath: `/HR/Employee Agreements/${emp.firstName} ${emp.lastName}`,
        permissions: "read",
        dataVolumeMb: Math.floor(Math.random() * 50) + 5,
        lastAccessDate: new Date(),
      }
    );
  }
  
  await db.insert(schema.folderAccess).values(folders);
  console.log(`✓ Seeded ${folders.length} folder access records`);

  console.log("\n💬 Seeding Communication Stats...");
  
  const commStats = [];
  for (let i = 0; i < employees.length; i++) {
    const emp1 = employees[i];
    for (let j = i + 1; j < Math.min(i + 4, employees.length); j++) {
      const emp2 = employees[j];
      commStats.push(
        {
          personId1: emp1.id,
          personId2: emp2.id,
          method: "email" as const,
          messageCount: Math.floor(Math.random() * 200) + 50,
          lastContactDate: new Date(),
        },
        {
          personId1: emp1.id,
          personId2: emp2.id,
          method: "teams" as const,
          messageCount: Math.floor(Math.random() * 150) + 30,
          lastContactDate: new Date(),
        }
      );
    }
  }
  
  await db.insert(schema.communicationStats).values(commStats);
  console.log(`✓ Seeded ${commStats.length} communication stats`);

  console.log("\n📈 Seeding Data Volume History...");
  
  const volumeHistory = [];
  for (const emp of employees) {
    for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);
      date.setDate(1);
      
      volumeHistory.push({
        personType: "employee",
        personId: emp.id,
        date,
        volumeGb: Math.floor(Math.random() * 50) + 10,
        messageCount: Math.floor(Math.random() * 1000) + 200,
      });
    }
  }
  
  await db.insert(schema.dataVolumeHistory).values(volumeHistory);
  console.log(`✓ Seeded ${volumeHistory.length} data volume history records`);

  console.log("\n✅ EMPLOYEE & VENDOR MONITORING DEMO DATA SEEDING COMPLETE!");
  console.log("=====================================");
  console.log(`📊 Employees: ${employees.length}`);
  console.log(`👔 Vendor Contacts: ${vendorContacts.length}`);
  console.log(`📱 Devices: ${devices.length}`);
  console.log(`📁 Folder Access: ${folders.length}`);
  console.log(`💬 Communication Stats: ${commStats.length}`);
  console.log(`📈 Data Volume History: ${volumeHistory.length}`);
  console.log("=====================================\n");
  console.log("🎉 Navigate to /monitoring/directory to see the Employee & Vendor Directory!");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🌱 Seeding Employee & Vendor Monitoring demo data...\n");
  
  seedMonitoringData()
    .then(() => {
      console.log("✅ Employee & Vendor monitoring demo data seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error seeding employee & vendor monitoring demo data:", error);
      process.exit(1);
    });
}
