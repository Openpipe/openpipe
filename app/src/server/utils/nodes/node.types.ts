import type {
  DatasetEntryInput,
  DatasetEntryOutput,
  Node,
  NodeEntry,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { ForwardEntriesSelectionExpression } from "~/server/tasks/nodes/processNodes/forwardNodeEntries";
import { ProcessEntryResult } from "~/server/tasks/nodes/processNodes/processNode.task";

import { chatInputs } from "~/types/dbColumns.types";
import { AtLeastOne, chatCompletionMessage, filtersSchema } from "~/types/shared.types";

export const DEFAULT_MAX_OUTPUT_SIZE = 50000;

type CacheMatchField = "nodeEntryPersistentId" | "incomingInputHash" | "incomingOutputHash";
type CacheWriteField =
  | "outgoingInputHash"
  | "outgoingOutputHash"
  | "outgoingSplit"
  | "filterOutcome"
  | "explanation";

export type NodeProperties = {
  cacheMatchFields?: AtLeastOne<CacheMatchField>;
  cacheWriteFields?: AtLeastOne<CacheWriteField>;
  readBatchSize?: number;
  getConcurrency?: (node: ReturnType<typeof typedNode>) => number;
  processEntry?: ({
    node,
    entry,
  }: {
    node: ReturnType<typeof typedNode> & Pick<Node, "projectId" | "hash">;
    entry: ReturnType<typeof typedNodeEntry> & Pick<NodeEntry, "id" | "outputHash">;
  }) => Promise<ProcessEntryResult>;
  beforeAll?: (
    node: ReturnType<typeof typedNode> & Pick<Node, "id" | "projectId" | "hash">,
  ) => Promise<void>;
  afterAll?: (node: ReturnType<typeof typedNode> & Pick<Node, "id" | "hash">) => Promise<void>;
  outputs: {
    label: string;
    selectionExpression?: ForwardEntriesSelectionExpression;
  }[];
};

export enum ArchiveOutput {
  Entries = "entries",
}

export enum MonitorOutput {
  MatchedLogs = "Matched Logs",
}

export enum FilterOutput {
  Passed = "passed",
  Failed = "failed",
}

export enum LLMRelabelOutput {
  Relabeled = "relabeled",
}

export enum ManualRelabelOutput {
  Relabeled = "relabeled",
}

export enum DatasetOutput {
  Entries = "entries",
}

export enum RelabelOption {
  GPT351106 = "gpt-3.5-turbo-1106",
  GPT41106 = "gpt-4-1106-preview",
  GPT40613 = "gpt-4-0613",
  SkipRelabel = "skip relabeling",
}

export const relabelOptions = [
  RelabelOption.GPT351106,
  RelabelOption.GPT41106,
  RelabelOption.GPT40613,
  RelabelOption.SkipRelabel,
] as const;

export const nodeSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("Archive"),
      config: z
        .object({
          maxOutputSize: z.number().default(DEFAULT_MAX_OUTPUT_SIZE),
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("Monitor"),
      config: z
        .object({
          initialFilters: filtersSchema,
          lastLoggedCallUpdatedAt: z.date().default(new Date(0)),
          maxOutputSize: z.number().default(DEFAULT_MAX_OUTPUT_SIZE),
          sampleRate: z.number().default(1),
          filterNodeId: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("Filter"),
      config: z
        .object({
          filters: filtersSchema,
          maxLLMConcurrency: z.number().default(2),
        })
        .passthrough(),
    })
    .passthrough(),
  z.object({
    type: z.literal("LLMRelabel"),
    config: z
      .object({
        relabelLLM: z.enum(relabelOptions).default(RelabelOption.SkipRelabel),
        maxLLMConcurrency: z.number().default(2),
      })
      .passthrough(),
  }),
  z
    .object({
      type: z.literal("ManualRelabel"),
      config: z
        .object({
          nodeId: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("Dataset"),
      config: z
        .object({
          llmRelabelNodeId: z.string(),
          manualRelabelNodeId: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
]);

export type InferNodeConfig<T extends z.infer<typeof nodeSchema>["type"]> = Extract<
  z.infer<typeof nodeSchema>,
  { type: T }
>["config"];

export const typedNode = <T extends Pick<Node, "type"> & { config: Prisma.JsonValue | object }>(
  input: T,
): Omit<T, "type" | "config"> & z.infer<typeof nodeSchema> => ({
  ...input,
  ...nodeSchema.parse(input),
});

const datasetEntryInput = z
  .object({
    messages: chatInputs.messages,
    tool_choice: chatInputs.tool_choice.nullable(),
    tools: chatInputs.tools.nullable(),
    response_format: chatInputs.response_format.nullable(),
  })
  .passthrough();

export const typedDatasetEntryInput = <
  T extends Pick<DatasetEntryInput, "messages" | "tool_choice" | "tools" | "response_format">,
>(
  input: T,
): Omit<T, "messages" | "tool_choice" | "tools" | "response_format"> &
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  z.infer<typeof datasetEntryInput> => datasetEntryInput.parse(input);

const datasetEntryOutput = z
  .object({
    output: chatCompletionMessage,
  })
  .passthrough();

export const typedDatasetEntryOutput = <T extends Pick<DatasetEntryOutput, "output">>(
  input: T,
): Omit<T, "output"> &
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  z.infer<typeof datasetEntryOutput> => datasetEntryOutput.parse(input);

const nodeEntry = z.intersection(datasetEntryInput, datasetEntryOutput.passthrough());

export const typedNodeEntry = <
  T extends Pick<DatasetEntryInput, "messages" | "tool_choice" | "tools" | "response_format"> &
    Pick<DatasetEntryOutput, "output">,
>(
  input: T,
): Omit<T, "messages" | "tool_choice" | "tools" | "response_format" | "output"> &
  z.infer<typeof nodeEntry> =>
  // @ts-expect-error zod doesn't type `passthrough()` correctly.
  nodeEntry.parse(input);