export interface UserDto {
  id: number;
  login: string;
  role: 'user' | 'admin' | string;

}
