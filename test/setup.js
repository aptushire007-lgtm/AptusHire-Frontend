import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount between tests, or every render stacks into the same document body and
// a getByRole that should match one element starts matching several.
afterEach(cleanup);

// jsdom has no layout engine and therefore no ResizeObserver. <ChipRow> observes
// its scroller to decide which edge fade to show and throws on mount without
// one. A no-op is the honest stub — jsdom reports every element as 0×0, so there
// is no resize to report and nothing here could pretend to measure one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;
