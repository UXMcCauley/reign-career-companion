import talentCardsJson from './talent-cards.json';
import { defaultLoggedInEmployee } from './defaultLoggedInEmployee';

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
export const demoEmployeeTalentCardIds = defaultLoggedInEmployee.talentCardIds;

export const demoEmployeeTalentCards = demoEmployeeTalentCardIds
  .map(id => allTalentCards.find(card => card.id === id))
  .filter((card): card is TalentCard => Boolean(card));
