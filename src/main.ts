// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app'; // ✅ debe llamarse igual que el export

bootstrapApplication(App, appConfig).catch(console.error);