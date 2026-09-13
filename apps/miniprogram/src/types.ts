export interface AccountMe {
  account: {
    id: string
    status: string
  }
  roles: {
    platformOperator: boolean
    domainOperatorDomainIds: string[]
    memberDomainIds: string[]
  }
  audience: 'miniprogram' | 'admin' | 'admin-platform' | 'admin-domain'
  loginName: string | null
  notDelivered: string[]
}

export interface AuthResponse extends AccountMe {
  token: string
}
