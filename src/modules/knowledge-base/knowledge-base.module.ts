import { Module } from '@nitrostack/core';
import { KnowledgeBaseTools } from './knowledge-base.tools.js';

@Module({
  name: 'knowledge-base',
  description: 'Knowledge base search and retrieval',
  controllers: [KnowledgeBaseTools]
})
export class KnowledgeBaseModule {}
