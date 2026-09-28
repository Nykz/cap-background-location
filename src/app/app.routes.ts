import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'tracker',
        loadComponent: () => import('./pages/tabs/tracker/tracker.page').then((m) => m.TrackerPage),
      },
      {
        path: 'queue',
        loadComponent: () => import('./pages/tabs/queue/queue.page').then((m) => m.QueuePage),
      },
      {
        path: 'upload',
        loadComponent: () => import('./pages/tabs/upload/upload.page').then((m) => m.UploadPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/tabs/settings/settings.page').then((m) => m.SettingsPage),
      },
      { path: '', redirectTo: 'tracker', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'tabs/tracker', pathMatch: 'full' },
  { path: '**', redirectTo: 'tabs/tracker' },
];
