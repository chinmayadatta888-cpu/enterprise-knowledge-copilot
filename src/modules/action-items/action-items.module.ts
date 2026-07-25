import { Module } from '@nitrostack/core';
import { ActionItemsTools } from './action-items.tools.js';

@Module({
  name: 'action-items',
  description: 'Action item tracker for demo sessions',
  controllers: [ActionItemsTools]
})
export class ActionItemsModule {}
