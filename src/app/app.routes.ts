import { Routes } from '@angular/router';

const t = (s: string) => `${s} · HireTrack`;

export const routes: Routes = [
  { path: '', title: 'HireTrack', loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage) },
  { path: 'board', title: t('Pipeline'), loadComponent: () => import('./features/board/board.page').then((m) => m.BoardPage) },
  { path: 'table', title: t('Applications'), loadComponent: () => import('./features/table/table.page').then((m) => m.TablePage) },
  { path: 'calendar', title: t('Calendar'), loadComponent: () => import('./features/calendar/calendar.page').then((m) => m.CalendarPage) },
  { path: 'app/:id', title: t('Application'), loadComponent: () => import('./features/application/application.page').then((m) => m.ApplicationPage) },
  { path: 'analytics', title: t('Analytics'), loadComponent: () => import('./features/analytics/analytics.page').then((m) => m.AnalyticsPage) },
  { path: 'resume', title: t('Resume'), loadComponent: () => import('./features/resume/resume.page').then((m) => m.ResumePage) },
  { path: 'match', title: t('Match'), loadComponent: () => import('./features/match/match.page').then((m) => m.MatchPage) },
  { path: 'letter', title: t('Cover letter'), loadComponent: () => import('./features/letter/letter.page').then((m) => m.LetterPage) },
  { path: 'settings', title: t('Settings'), loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage) },
  { path: '**', redirectTo: '' },
];
