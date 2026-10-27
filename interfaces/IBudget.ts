export interface IBudget {
  _id: string;
  name: string;
  archived?: boolean;
  spent?: number;
  target?: number | null;
  currency?: string;
}
