import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Users, Building2, Filter, ArrowUpDown } from "lucide-react";
import type { Employee, Vendor } from "@shared/schema";

type DirectoryPerson = 
  | (Employee & { personType: 'employee'; displayName: string; departmentOrType: string }) 
  | (Vendor & { personType: 'vendor'; displayName: string; departmentOrType: string; email: string; companyName: string; complianceScore: number; riskLevel: string });

export default function MonitoringDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "employee" | "vendor">("all");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "score-asc" | "score-desc">("name-asc");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: vendors = [], isLoading: loadingVendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const combinedData: DirectoryPerson[] = useMemo(() => {
    const employeeData = employees.map(emp => ({
      ...emp,
      personType: 'employee' as const,
      displayName: `${emp.firstName} ${emp.lastName}`,
      departmentOrType: emp.department,
    }));

    const vendorData = vendors.map(vendor => ({
      ...vendor,
      personType: 'vendor' as const,
      displayName: vendor.vendorName,
      departmentOrType: vendor.industry || 'N/A',
      email: vendor.primaryContactEmail || 'N/A',
      companyName: vendor.vendorName,
      complianceScore: vendor.overallRiskScore || 0,
      riskLevel: vendor.tier === 'critical' ? 'critical' : vendor.tier === 'strategic' ? 'high' : vendor.tier === 'tactical' ? 'medium' : 'low',
    }));

    return [...employeeData, ...vendorData];
  }, [employees, vendors]);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department));
    return Array.from(depts).sort();
  }, [employees]);

  const vendorTypes = useMemo(() => {
    const types = new Set(
      vendors
        .map(v => v.industry)
        .filter((i): i is string => i !== null && i !== '')
    );
    return Array.from(types).sort();
  }, [vendors]);

  const filteredData = useMemo(() => {
    const filtered = combinedData.filter((person) => {
      // Type filter
      if (typeFilter !== "all" && person.personType !== typeFilter) {
        return false;
      }

      // Department/Type filter - only apply when a specific type is selected
      if (departmentFilter !== "all" && typeFilter !== "all") {
        if (person.departmentOrType !== departmentFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = person.displayName.toLowerCase().includes(query);
        const matchesEmail = person.email?.toLowerCase().includes(query);
        const matchesDeptOrType = person.departmentOrType.toLowerCase().includes(query);
        
        if (person.personType === 'vendor') {
          const matchesCompany = person.companyName?.toLowerCase().includes(query);
          return matchesName || matchesEmail || matchesDeptOrType || matchesCompany;
        }
        
        return matchesName || matchesEmail || matchesDeptOrType;
      }

      return true;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy.startsWith('name')) {
        const comparison = a.displayName.localeCompare(b.displayName);
        return sortBy === 'name-asc' ? comparison : -comparison;
      } else {
        // Sort by compliance score
        const scoreA = a.complianceScore || 0;
        const scoreB = b.complianceScore || 0;
        return sortBy === 'score-asc' ? scoreA - scoreB : scoreB - scoreA;
      }
    });

    return sorted;
  }, [combinedData, typeFilter, departmentFilter, searchQuery, sortBy]);

  const getRiskBadgeVariant = (riskLevel: string | null) => {
    switch (riskLevel) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getComplianceColor = (score: number | null) => {
    if (!score) return "text-gray-500";
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const isLoading = loadingEmployees || loadingVendors;

  const filterOptions = useMemo(() => {
    const options = typeFilter === 'all' 
      ? [...departments, ...vendorTypes]
      : typeFilter === 'employee' 
        ? departments 
        : vendorTypes;
    // Remove duplicates and empty strings
    return Array.from(new Set(options)).filter(opt => opt && opt.trim() !== '');
  }, [typeFilter, departments, vendorTypes]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
              Employee & Vendor Directory
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor all employees and third-party vendors with detailed compliance profiles
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 relative min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              
              <Select
                value={typeFilter}
                onValueChange={(value: any) => {
                  setTypeFilter(value);
                  setDepartmentFilter("all");
                }}
              >
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="vendor">Vendors</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
              >
                <SelectTrigger className="w-48" data-testid="select-department-filter">
                  <SelectValue placeholder={typeFilter === 'employee' ? "Department" : typeFilter === 'vendor' ? "Vendor Type" : "Dept/Type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {typeFilter === 'employee' ? 'Departments' : typeFilter === 'vendor' ? 'Types' : 'Dept/Types'}</SelectItem>
                  {filterOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-56" data-testid="select-sort-by">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A → Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z → A)</SelectItem>
                  <SelectItem value="score-desc">Compliance Score (High → Low)</SelectItem>
                  <SelectItem value="score-asc">Compliance Score (Low → High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Dept/Type</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-center">Compliance Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No results found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((person) => (
                      <TableRow key={`${person.personType}-${person.id}`} data-testid={`row-person-${person.id}`}>
                        <TableCell>
                          <Badge variant={person.personType === 'employee' ? "default" : "outline"}>
                            {person.personType === 'employee' ? <Users className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
                            {person.personType === 'employee' ? 'Employee' : 'Vendor'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-name-${person.id}`}>
                          {person.displayName}
                        </TableCell>
                        <TableCell data-testid={`text-email-${person.id}`}>{person.email}</TableCell>
                        <TableCell>{person.departmentOrType}</TableCell>
                        <TableCell>
                          {person.personType === 'vendor' ? person.companyName : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${getComplianceColor(person.complianceScore)}`} data-testid={`text-score-${person.id}`}>
                            {person.complianceScore || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskBadgeVariant(person.riskLevel)} data-testid={`badge-risk-${person.id}`}>
                            {person.riskLevel || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/monitoring/profile/${person.personType}/${person.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-view-profile-${person.id}`}>
                              View Profile
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing {filteredData.length} of {combinedData.length} total records
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
