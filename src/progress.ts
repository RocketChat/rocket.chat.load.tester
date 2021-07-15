import * as chalk from 'chalk';
import { MultiProgressBars } from 'multi-progress-bars';

export const progress = new MultiProgressBars({
  initMessage: '$ Tasks ',
  anchor: 'top',
  persist: true,
  border: true,
});

export const addTask = (
  key: string,
  mpb: MultiProgressBars,
  type: 'indefinite' | 'percentage' = 'percentage'
) => {
  mpb.addTask(key, {
    type,
    barTransformFn: chalk.green,
    nameTransformFn: chalk.bold,
  });

  const incrementTask = (...args: any) => {
    mpb.incrementTask(key, ...args);
  };

  const updateTask = (...args: any) => {
    mpb.updateTask(key, ...args);
  };
  const done = (...args: any) => {
    mpb.done(key, ...args);
  };
  return { incrementTask, updateTask, done };
};

export const snapshot = addTask('Initial Snapshot', progress, 'indefinite');
