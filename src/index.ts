import FormData from 'form-data';
import fetch from 'node-fetch';

import agent from './agent';
import profile from './profile';

import './server';

(global as any).fetch = fetch;
(global as any).FormData = FormData;

// profile();
agent();
