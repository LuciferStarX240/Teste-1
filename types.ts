export enum Role {
  MECHANIC = 'mecanico',
  MANAGER = 'gerente',
  OWNER = 'dono'
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Sale {
  id: string;
  userId: string; // The mechanic who made the sale
  userName?: string; // Denormalized for display
  serviceId: string;
  serviceName?: string; // Denormalized for display
  quantity: number;
  discount?: number;
  total: number;
  createdAt: number; // Timestamp
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface AppSettings {
  companyName: string;
  loginTitle: string;
  logoUrl: string;
  webhookUrl: string;
}

export interface Log {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  createdAt: number;
}

export interface Timesheet {
  id: string;
  userId: string;
  clockIn: number;
  clockOut?: number;
}
