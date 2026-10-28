import { createRoot } from 'react-dom/client';
import { ProfileSettings } from './ProfileSettings';
import { PublicationSettings } from './PublicationSettings';
const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = '/community/profile.css';
document.head.append(style);
createRoot(document.getElementById('root')!).render(
  location.pathname.startsWith('/settings/publications') ? (
    <PublicationSettings />
  ) : (
    <ProfileSettings />
  ),
);
