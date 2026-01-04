export const REQUEST_USER_KEY = 'user';

export const AuthType = {
   Bearer: 'Bearer',
   None: 'None',
   ApiKey: 'ApiKey'
} as const;

export type AuthTypeType = (typeof AuthType)[keyof typeof AuthType];

export const ConditionGuard = {
   AND: 'AND',
   OR: 'OR'
} as const;

export type ConditionGuardType = (typeof ConditionGuard)[keyof typeof ConditionGuard];

export const UserStatus = {
   ACTIVE: 'ACTIVE',
   BLOCKED: 'BLOCKED',
   INACTIVE: 'INACTIVE',
} as const