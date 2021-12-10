import FormData from 'form-data';
import fetch from 'node-fetch';

import profile from './profile';
import './server';

(global as any).fetch = fetch;
(global as any).FormData = FormData;

profile();
