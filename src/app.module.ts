import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module.js';
import { ActionItemsModule } from './modules/action-items/action-items.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module
 * 
 * This is the main module that bootstraps the MCP server.
 * It registers all feature modules and health checks.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'enterprise-knowledge-copilot',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Root application module',
  imports: [
    ConfigModule.forRoot(),
    KnowledgeBaseModule,
    ActionItemsModule
  ],
  providers: [
    // Health Checks
    SystemHealthCheck,
  ]
})
export class AppModule {}
