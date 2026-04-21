import { Routes } from '@angular/router';
import { LoginComponent }    from './components/login/login.component';
import { ConsultaComponent } from './components/consulta/consulta.component';
import { RegistroComponent } from './components/registro/registro.component';

export const routes: Routes = [
  { path: '',          component: LoginComponent    },
  { path: 'login',     component: LoginComponent    },
  { path: 'consulta',  component: ConsultaComponent },
  { path: 'registro',  component: RegistroComponent },
  { path: '**',        redirectTo: ''               },
];