/**
 * Workflows Index
 *
 * Centralized export of all workflow classes
 */

export { ContentGenerationWorkflow } from './content-generation-workflow';
export { AutoOptimizationWorkflow } from './auto-optimization-workflow';
export { InternalLinkingWorkflow } from './internal-linking-workflow';
export { BatchProcessingWorkflow } from './batch-processing-workflow';

export type {
  ContentGenerationWorkflowInput,
  ContentGenerationWorkflowResult,
} from './content-generation-workflow';

export type {
  OptimizationWorkflowInput,
  OptimizationWorkflowResult,
} from './auto-optimization-workflow';

export type {
  InternalLinkingWorkflowInput,
  InternalLinkingWorkflowResult,
} from './internal-linking-workflow';

export type {
  BatchProcessingWorkflowInput,
  BatchProcessingWorkflowResult,
} from './batch-processing-workflow';
