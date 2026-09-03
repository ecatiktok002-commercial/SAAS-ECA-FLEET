import { readFileSync } from 'fs';
try {
  import('./pages/AdminDashboard.tsx');
  console.log('Success');
} catch (e) {
  console.error(e);
}
