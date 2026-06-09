import { defaultLoggedInEmployee } from './defaultLoggedInEmployee';

export type EditableProfile = {
  displayName: string;
  headshotDataUrl: string;
  bio: string;
  phones: string[];
  emails: string[];
  linkedIn: string;
  portfolioUrl: string;
  portfolioTitle: string;
};

export const PROFILE_STORAGE_KEY = 'reign_profile_data_v1';

export const defaultProfile = (userName: string): EditableProfile => ({
  displayName: defaultLoggedInEmployee.displayName || userName || '',
  headshotDataUrl: defaultLoggedInEmployee.avatarUrl || '',
  bio:
    defaultLoggedInEmployee.bio ||
    `${userName || defaultLoggedInEmployee.firstName || 'Demo employee'} is building a strong cross-functional digital product and engineering path.`,
  phones: defaultLoggedInEmployee.phoneNumbers?.length ? [...defaultLoggedInEmployee.phoneNumbers] : [''],
  emails: defaultLoggedInEmployee.primaryEmail ? [defaultLoggedInEmployee.primaryEmail] : [''],
  linkedIn: defaultLoggedInEmployee.linkedInUrl || '',
  portfolioUrl: defaultLoggedInEmployee.portfolioUrl || '',
  portfolioTitle: defaultLoggedInEmployee.portfolioTitle || ''
});

export const readStoredProfile = (userName: string): EditableProfile => {
  const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<EditableProfile>;
      return {
        ...defaultProfile(userName),
        ...parsed,
        phones: Array.isArray(parsed.phones) && parsed.phones.length ? parsed.phones : [''],
        emails: Array.isArray(parsed.emails) && parsed.emails.length ? parsed.emails : [''],
        displayName: parsed.displayName ?? defaultLoggedInEmployee.displayName ?? '',
        linkedIn: parsed.linkedIn ?? '',
        portfolioUrl: parsed.portfolioUrl ?? '',
        portfolioTitle: parsed.portfolioTitle ?? ''
      };
    } catch {
      return defaultProfile(userName);
    }
  }
  return defaultProfile(userName);
};
