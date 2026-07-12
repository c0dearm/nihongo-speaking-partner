import { RoleplayScenario } from '../../types';

export const CURATED_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'n5-diner-order',
    title: 'Ordering Lunch at a Diner',
    jlptLevel: 'N5',
    category: 'dining',
    goalDescription: 'Order two beef rice bowls (gyudon) and hot green tea, and ask for the total bill.',
    userRole: 'Customer in a Tokyo diner',
    aiRole: 'Diner Waiter (Friendly simple Japanese)',
  },
  {
    id: 'n4-izakaya-reservation',
    title: 'Reserving an Izakaya Table',
    jlptLevel: 'N4',
    category: 'dining',
    goalDescription: 'Call an izakaya to reserve a table for 5 people for this Saturday at 7:00 PM under the name Tanaka, and ask if they have a non-smoking section.',
    userRole: 'Customer calling the izakaya',
    aiRole: 'Izakaya Host (Polite desu-masu)',
  },
  {
    id: 'n3-ryokan-checkin',
    title: 'Hotel Check-in & Special Request',
    jlptLevel: 'N3',
    category: 'travel',
    goalDescription: 'Check into a traditional ryokan, ask if you can leave your luggage at the desk until 3:00 PM, and inquire about the private onsen reservation hours.',
    userRole: 'Hotel Guest checking in',
    aiRole: 'Ryokan Front Desk Clerk (Polite / Keigo)',
  },
  {
    id: 'n2-lost-umbrella',
    title: 'Lost Property at the Train Station',
    jlptLevel: 'N2',
    category: 'daily_life',
    goalDescription: 'Explain to the station officer that you left a navy blue folding umbrella on the Yamanote line 30 minutes ago, describing its wooden handle and exact train direction.',
    userRole: 'Commuter reporting lost item',
    aiRole: 'Station Lost & Found Officer',
  },
  {
    id: 'n1-meeting-reschedule',
    title: 'Rescheduling a High-Stakes Client Pitch',
    jlptLevel: 'N1',
    category: 'business',
    goalDescription: 'Politely explain to your department manager that an urgent client emergency has occurred, apologize with formal keigo, and negotiate rescheduling tomorrow morning\'s project pitch to Friday afternoon.',
    userRole: 'Project Lead / Subordinate',
    aiRole: 'Strict Department Manager (Keigo / Formal)',
  },
];
