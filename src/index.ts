import FormData from 'form-data';
import fetch from 'node-fetch';

import agent from './agent';
import type { ObjectKeys } from './definifitons';
import profile from './profile';
import profileUser from './profile-login';

import './server';

(global as any).fetch = fetch;
(global as any).FormData = FormData;

const actions = {
	agent,
	profile,
	profileUser,
};

const actionsParam = process.argv[2];
let actionList: ObjectKeys<typeof actions>;

if (!actionsParam?.includes('process')) {
	// will run only 'profile' by default
	actionList = ['profile'];
} else {
	actionList = actionsParam.split('--process=').pop()?.split(',') as ObjectKeys<typeof actions>;
}

actionList.forEach((action) => {
	console.log(`Running action: ${action}`);
	actions[action]();
});
