/**
 * @fileoverview Public facade for automatic worker tab-state aggregation.
 * @module worker/auto-tab-aggregate
 */

export { aggregateAutoFrameStates } from "./auto-tab-aggregate/aggregate-auto-frame-states";
export type {
  AggregatedAutoTabState,
  AutoDebugStateSnapshot,
  AutoTabAggregation
} from "./auto-tab-aggregate/auto-tab-aggregation-contract";
