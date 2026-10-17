// Members are the platform strings in attack.json; ones missing from the data are harmless.
export const PLATFORM_GROUPS = [
  { key: 'windows', label: 'Windows', members: ['Windows'] },
  { key: 'linux', label: 'Linux', members: ['Linux'] },
  { key: 'macos', label: 'macOS', members: ['macOS'] },
  {
    key: 'cloud',
    label: 'Cloud',
    members: ['IaaS', 'SaaS', 'Office Suite', 'Identity Provider', 'Google Workspace', 'Azure AD', 'Office 365'],
  },
  { key: 'network', label: 'Network', members: ['Network', 'Network Devices'] },
  { key: 'containers', label: 'Containers', members: ['Containers'] },
]
