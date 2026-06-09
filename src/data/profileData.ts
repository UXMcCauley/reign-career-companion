export type EditableProfile = {
  headshotDataUrl: string;
  bio: string;
  phones: string[];
  emails: string[];
  linkedIn: string;
  portfolioUrl: string;
};

export const PROFILE_STORAGE_KEY = 'reign_profile_data_v1';

export const defaultProfile = (userName: string): EditableProfile => ({
  headshotDataUrl: '',
  bio: `${userName || 'Demo employee'} is building a strong cross-functional digital product and engineering path.`,
  phones: [''],
  emails: [''],
  linkedIn: '',
  portfolioUrl: ''
});

export const readStoredProfile = (userName: string): EditableProfile => {
  const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as EditableProfile;
    } catch {
      return defaultProfile(userName);
    }
  }
  return defaultProfile(userName);
};
