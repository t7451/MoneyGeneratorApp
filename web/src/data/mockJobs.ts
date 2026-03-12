export interface Job {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  pay: {
    amount: number;
    unit: 'hour' | 'job' | 'delivery';
    currency: string;
  };
  location: {
    city: string;
    distance?: string;
  };
  tags: string[];
  postedAt: string;
  urgency?: 'high' | 'medium' | 'low';
}

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Grocery Delivery Driver',
    company: 'Instacart',
    pay: { amount: 25, unit: 'hour', currency: 'USD' },
    location: { city: 'Downtown', distance: '1.2 mi' },
    tags: ['Delivery', 'Flexible'],
    postedAt: '2026-03-12T08:00:00Z',
    urgency: 'high'
  },
  {
    id: '2',
    title: 'Dog Walker',
    company: 'Wag!',
    pay: { amount: 30, unit: 'job', currency: 'USD' },
    location: { city: 'Westside', distance: '3.5 mi' },
    tags: ['Pets', 'Outdoor'],
    postedAt: '2026-03-12T09:30:00Z',
    urgency: 'medium'
  },
  {
    id: '3',
    title: 'Event Staff - Server',
    company: 'Qwick',
    pay: { amount: 22, unit: 'hour', currency: 'USD' },
    location: { city: 'Convention Center', distance: '5.0 mi' },
    tags: ['Hospitality', 'Shift'],
    postedAt: '2026-03-11T14:15:00Z',
  },
  {
    id: '4',
    title: 'Rideshare Driver',
    company: 'Uber',
    pay: { amount: 35, unit: 'hour', currency: 'USD' },
    location: { city: 'Metro Area', distance: '0.5 mi' },
    tags: ['Driving', 'Passenger'],
    postedAt: '2026-03-12T10:00:00Z',
    urgency: 'low'
  },
  {
    id: '5',
    title: 'Package Handler',
    company: 'Amazon Flex',
    pay: { amount: 80, unit: 'job', currency: 'USD' },
    location: { city: 'North Warehouse', distance: '8.2 mi' },
    tags: ['Logistics', 'Heavy Lifting'],
    postedAt: '2026-03-10T09:00:00Z',
  }
];
