export type EditableProfile = {
  headshotDataUrl: string;
  bio: string;
  phones: string[];
  emails: string[];
  linkedIn: string;
  linkedInTitle: string;
  portfolioUrl: string;
  portfolioTitle: string;
};

export const PROFILE_STORAGE_KEY = 'reign_profile_data_v1';

export const defaultProfile = (userName: string): EditableProfile => ({
  headshotDataUrl: '',
  bio: `${userName || 'Demo employee'} is building a strong cross-functional digital product and engineering path.`,
  phones: [''],
  emails: [''],
  linkedIn: '',
  linkedInTitle: '',
  portfolioUrl: '',
  portfolioTitle: ''
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
        linkedIn: parsed.linkedIn ?? '',
        linkedInTitle: parsed.linkedInTitle ?? '',
        portfolioUrl: parsed.portfolioUrl ?? '',
        portfolioTitle: parsed.portfolioTitle ?? ''
      };
    } catch {
      return defaultProfile(userName);
    }
  }
  return defaultProfile(userName);
};
