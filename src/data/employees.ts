import employeesRaw from './Employees.json';

interface EmployeeRecord {
  id: number;
  first_name: string;
  last_name: string;
  job_title: string;
}

export interface DemoEmployee {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
}

const source = employeesRaw as EmployeeRecord[];

export const DEMO_EMPLOYEES: DemoEmployee[] = source.map(employee => ({
  id: `emp-${employee.id}`,
  firstName: employee.first_name,
  lastName: employee.last_name,
  name: `${employee.first_name} ${employee.last_name}`,
  role: employee.job_title,
}));

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
