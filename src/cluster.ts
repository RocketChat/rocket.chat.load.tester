import { Emitter } from '@rocket.chat/emitter';
import discover from 'node-discover';

export const cluster = () => {
  const d = discover({}, undefined) as unknown as Emitter & {
    send: (channel: string, obj: any) => void;
    join: (channel: string, fn: () => void) => void;
  };

  d.on('promotion', () => {
    /*
     * Launch things this master process should do.
     *
     * For example:
     *	- Monitior your redis servers and handle failover by issuing slaveof
     *    commands then notify other node instances to use the new master
     *	- Make sure there are a certain number of nodes in the cluster and
     *    launch new ones if there are not enough
     *	- whatever
     *
     */

    console.log('I was promoted to a master.');
  });

  d.on('demotion', () => {
    /*
     * End all master specific functions or whatever you might like.
     *
     */

    console.log('I was demoted from being a master.');
  });

  d.on('added', (_obj) => {
    console.log('A new node has been added.');
  });

  d.on('removed', (_obj) => {
    console.log('A node has been removed.');
  });

  d.on('master', (_obj) => {
    /*
     * A new master process has been selected
     *
     * Things we might want to do:
     * 	- Review what the new master is advertising use its services
     *	- Kill all connections to the old master
     */

    d.send('teste', 1231231);
    console.log('A new master is in control');
  });

  d.join('teste', console.log);
  return d;
};
