import { Module } from '@nitrostack/core';
import { KnowledgeBaseTools } from './knowledge-base.tools.js';
import { GenerateMigrationBriefTools } from './generate-migration-brief.js';

@Module({
  name: 'knowledge-base',
  description: 'Knowledge base search and retrieval',
  controllers: [KnowledgeBaseTools, GenerateMigrationBriefTools]
})
export class KnowledgeBaseModule {}
