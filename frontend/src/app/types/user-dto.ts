export interface UserDto {
  id: number;
  nom?: string;
  prenom?: string;
  email: string;
  login: string;
  role: UserRole,
  created_at?: string;
  updated_at?: string;
}

export type UserRole = 'admin' | 'super organisateur' | 'organisateur' | 'benevole' | 'visiteur' | 'user';
