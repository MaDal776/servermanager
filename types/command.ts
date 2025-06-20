export interface CommandInfo {
  id: string;
  name: string;
  command: string;
  category: string;
  description?: string;
  createdAt: string | Date;
}
