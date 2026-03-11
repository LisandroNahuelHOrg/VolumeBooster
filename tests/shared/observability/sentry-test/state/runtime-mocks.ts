import type { ListenerHandler } from "./scope-stub-types";

export const initMock = vi.fn();
export const makeFetchTransportMock = vi.fn();
export const withScopeMock = vi.fn();
export const captureExceptionMock = vi.fn();
export const captureMessageMock = vi.fn();
export const listenerMap = new Map<string, ListenerHandler>();
