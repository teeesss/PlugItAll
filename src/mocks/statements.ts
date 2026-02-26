export interface Transaction {
  date: string;
  description: string;
  amount: number;
  source?: string; // Filename of the uploaded statement
  institution?: string; // Human-readable bank name (e.g. "Citi", "SoFi", "USAA")
}

export const MOCK_CSV_CONTENT = `Date,Description,Amount
2023-10-01,NETFLIX.COM,15.99
2023-10-02,STARBUCKS #32902,5.45
2023-10-05,SPOTIFY USA,10.99
2023-10-15,AWS SERVICES,32.40
2023-10-28,Gym Membership,45.00
2023-11-01,NETFLIX.COM,15.99
2023-11-03,SHELL OIL 123,40.00
2023-11-05,SPOTIFY USA,10.99
2023-11-15,AWS SERVICES,32.45
2023-11-28,Gym Membership,45.00
2023-12-01,NETFLIX.COM,15.99
2023-12-05,SPOTIFY USA,10.99
2023-12-15,AWS SERVICES,32.40
2023-12-28,Gym Membership,45.00
`;

export const MOCK_TRANSACTIONS: Transaction[] = [
  { date: '2023-10-01', description: 'NETFLIX.COM', amount: 15.99 },
  { date: '2023-10-02', description: 'STARBUCKS #32902', amount: 5.45 },
  { date: '2023-10-05', description: 'SPOTIFY USA', amount: 10.99 },
  { date: '2023-10-15', description: 'AWS SERVICES', amount: 32.4 },
  { date: '2023-10-28', description: 'Gym Membership', amount: 45.0 },
  { date: '2023-11-01', description: 'NETFLIX.COM', amount: 15.99 },
  { date: '2023-11-03', description: 'SHELL OIL 123', amount: 40.0 },
  { date: '2023-11-05', description: 'SPOTIFY USA', amount: 10.99 },
  { date: '2023-11-15', description: 'AWS SERVICES', amount: 32.45 },
  { date: '2023-11-28', description: 'Gym Membership', amount: 45.0 },
  { date: '2023-12-01', description: 'NETFLIX.COM', amount: 15.99 },
  { date: '2023-12-05', description: 'SPOTIFY USA', amount: 10.99 },
  { date: '2023-12-15', description: 'AWS SERVICES', amount: 32.4 },
  { date: '2023-12-28', description: 'Gym Membership', amount: 45.0 },
];
