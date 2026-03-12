import { Role } from '../enums/role.enum';

export const ROLES = {
  [Role.ADMIN]: {
    name: 'Administrator',
    permissions: ['*']
  },
  [Role.SALES]: {
    name: 'Sales Representative',
    permissions: [
      'read:leads',
      'create:leads',
      'update:leads',
      'read:customers',
      'create:customers',
      'update:customers'
    ]
  },
  [Role.CALLER]: {
    name: 'Caller',
    permissions: [
      'read:leads',
      'update:leads',
      'read:customers'
    ]
  }
};

export const DEFAULT_ROLE = Role.SALES;
