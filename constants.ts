import { AppSettings, Role } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "Benny's Motorworks",
  loginTitle: "Mechanic Portal Access",
  logoUrl: "https://picsum.photos/200/200",
  webhookUrl: ""
};

export const MOCK_DELAY = 600;

export const MENU_ITEMS = [
  { label: 'Dashboard', path: '/', roles: [Role.MECHANIC, Role.MANAGER, Role.OWNER], icon: 'fa-chart-pie' },
  { label: 'Nova Venda', path: '/sales', roles: [Role.MECHANIC, Role.MANAGER, Role.OWNER], icon: 'fa-wrench' },
  { label: 'Serviços', path: '/services', roles: [Role.MANAGER, Role.OWNER], icon: 'fa-list' },
  { label: 'Equipe', path: '/team', roles: [Role.MANAGER, Role.OWNER], icon: 'fa-users' },
  { label: 'Configurações', path: '/settings', roles: [Role.OWNER], icon: 'fa-cogs' },
];
