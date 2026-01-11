import { vi } from "vitest";
import type {
  LanguageModelV1,
  EmbeddingModel,
  EmbedManyResult,
  Embedding,
} from "ai";
import type { MatcherContext } from "expect";

/**
 * Creates a mock language model for testing
 */
export function createMockLanguageModel(): LanguageModelV1 {
  return {
    specificationVersion: "v1",
    provider: "mock",
    modelId: "mock-model",
    defaultObjectGenerationMode: "json",
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  } as unknown as LanguageModelV1;
}

/**
 * Creates a mock embedding model for testing
 */
export function createMockEmbeddingModel(): EmbeddingModel<string> {
  return {
    specificationVersion: "v1",
    provider: "mock",
    modelId: "mock-embedding",
    doEmbed: vi.fn(),
  } as unknown as EmbeddingModel<string>;
}

/**
 * Creates a minimal mock matcher context for testing Jest matchers.
 * The matchers don't use the utility functions, so we only need isNot and promise.
 */
export function createMatcherContext(isNot = false): MatcherContext {
  return {
    isNot,
    promise: "",
    // Provide minimal stubs for required MatcherUtils properties
    customTesters: [],
    dontThrow: () => {},
    equals: () => false,
    utils: {
      iterableEquality: () => false,
      subsetEquality: () => false,
    },
  } as unknown as MatcherContext;
}

/**
 * Helper to create a mock generateObject response
 */
export function mockGenerateObjectResponse(pass: boolean, explanation: string) {
  return {
    object: { pass, explanation },
    finishReason: "stop" as const,
    usage: { promptTokens: 100, completionTokens: 50 },
  };
}

/**
 * Helper to create multiple mock responses for sampling tests
 */
export function createMockResponses(
  passPattern: boolean[],
): ReturnType<typeof mockGenerateObjectResponse>[] {
  return passPattern.map((pass, i) =>
    mockGenerateObjectResponse(
      pass,
      pass ? `Sample ${i + 1} passed` : `Sample ${i + 1} failed`,
    ),
  );
}

/**
 * Helper to create a properly typed embedMany result for testing
 */
export function createEmbedManyResult(
  embeddings: Embedding[],
  values: string[] = ["text1", "text2"],
): EmbedManyResult<string> {
  return {
    embeddings,
    values,
    usage: { tokens: 10 },
  };
}

/**
 * Helper to create mock embeddings with desired similarity
 */
export function createMockEmbeddings(
  similarity: number,
): EmbedManyResult<string> {
  // Create two vectors with the desired cosine similarity
  // For simplicity, we use unit vectors
  const v1: Embedding = [1, 0, 0];

  // Create v2 such that cos(angle) = similarity
  // v2 = [similarity, sqrt(1 - similarity^2), 0]
  const v2: Embedding = [similarity, Math.sqrt(1 - similarity * similarity), 0];

  return createEmbedManyResult([v1, v2]);
}
