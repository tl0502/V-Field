export type AdminShellConfig = {
  storageKey: string
  loginTitle: string
  loginCopy: string
  identityTitle: string
}

let config: AdminShellConfig | null = null

export function initAdminShell(value: AdminShellConfig) {
  config = value
}

export function adminShellConfig() {
  if (!config) {
    throw new Error('admin shell is not initialized')
  }
  return config
}
