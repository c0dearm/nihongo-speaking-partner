import { RoleplayScenario } from '../../types';

export const CURATED_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'diner_order',
    title: 'Ordering Lunch at a Diner',
    category: 'dining',
    goalDescription: 'Order a lunch set meal without onions, and ask for a glass of water and the check at the end.',
    userRole: 'Hungry customer',
    aiRole: 'Friendly diner waiter/waitress',
    isCustom: false,
  },
  {
    id: 'izakaya_reserve',
    title: 'Reserving an Izakaya Table',
    category: 'dining',
    goalDescription: 'Call an izakaya to reserve a table for 5 people for Saturday at 7pm under the name Tanaka, and confirm whether smoking is permitted.',
    userRole: 'Customer calling the izakaya',
    aiRole: 'Busy izakaya host/hostess taking reservations on the phone',
    isCustom: false,
  },
  {
    id: 'hotel_checkin',
    title: 'Hotel Check-in & Special Request',
    category: 'travel',
    goalDescription: 'Check into your hotel reservation, request a room on a high floor with a quiet view if possible, and ask what time breakfast is served.',
    userRole: 'Hotel guest checking in',
    aiRole: 'Polite front desk receptionist at a Tokyo hotel',
    isCustom: false,
  },
  {
    id: 'lost_property',
    title: 'Lost Property at the Train Station',
    category: 'daily_life',
    goalDescription: 'Explain to the station officer that you left a black leather umbrella on the Yamanote line train that arrived 15 minutes ago, and ask where you can pick it up.',
    userRole: 'Commuter who lost their item on the train',
    aiRole: 'Helpful station master at the Lost & Found window',
    isCustom: false,
  },
  {
    id: 'client_reschedule',
    title: 'Rescheduling a High-Stakes Client Pitch',
    category: 'business',
    goalDescription: 'Call your business client to apologize and explain that due to an unexpected train delay and family emergency, you need to reschedule tomorrow morning\'s presentation to next Thursday afternoon.',
    userRole: 'Account manager asking for a schedule change',
    aiRole: 'Strict but professional business client',
    isCustom: false,
  },
];
