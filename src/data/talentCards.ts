import talentCardsJson from './talent-cards.json';

export interface TalentCardSkill {
  name: string;
  lv1: string;
  lv2: string;
  lv3: string;
}

export interface TalentCard {
  id: string;
  socCode: string;
  majorGroupCode: string;
  majorGroupName: string;
  name: string;
  initials: string;
  isActive: boolean;
  category: string;
  description: string;
  skills: TalentCardSkill[];
  createdAt: string;
  updatedAt: string;
}

export const allTalentCards = talentCardsJson as TalentCard[];

// Five related cards for the demo employee (digital product + engineering path).
export const demoEmployeeTalentCardIds = [
  'soc-11-3020',
  'soc-15-1210',
  'soc-15-1250',
  'soc-17-2050',
  'soc-27-1020'
] as const;

export const demoEmployeeTalentCards = demoEmployeeTalentCardIds
  .map(id => allTalentCards.find(card => card.id === id))
  .filter((card): card is TalentCard => Boolean(card));
