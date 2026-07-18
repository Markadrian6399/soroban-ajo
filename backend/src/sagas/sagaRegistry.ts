import type { SagaDefinition } from './sagaOrchestrator'

/**
 * Saga step closures can't be persisted — only the step *names* and the
 * data they operated on (`payload`/`context`) live in the database. To
 * resume a saga (same process retry, or a different process after a
 * crash) we need to rebuild the exact same step list from the saga's
 * `name` and stored `payload`. This registry is that lookup: every saga
 * definition must register itself here before `sagaRecovery` can find it.
 */
const registry = new Map<string, SagaDefinition<any, any>>()

export function registerSaga(definition: SagaDefinition<any, any>): void {
  if (registry.has(definition.name)) {
    throw new Error(`Saga "${definition.name}" is already registered`)
  }
  registry.set(definition.name, definition)
}

export function getSagaDefinition(name: string): SagaDefinition<any, any> | undefined {
  return registry.get(name)
}

export function listRegisteredSagaNames(): string[] {
  return Array.from(registry.keys())
}
