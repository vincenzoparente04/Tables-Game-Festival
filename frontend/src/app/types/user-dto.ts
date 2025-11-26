export interface UserDto {
  id: number;
  nom?: string;
  prenom?: string;
  email: string;
  login: string;
  role: 'user' | 'admin' | 'super organisateur' | 'organisateur' | 'benevole' | 'visiteur';

}
