import { type Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { type z } from "zod";

import {
  prepareArchiveCreation,
  prepareDatasetCreation,
  prepareLLMRelabelCreation,
  prepareManualRelabelCreation,
  prepareMonitorCreation,
  prepareFilterCreation,
} from "./prepareNodeCreation";
import { RelabelOption } from "../node.types";
import { prisma } from "~/server/db";
import { type filtersSchema } from "~/types/shared.types";

export const prepareIntegratedArchiveCreation = ({
  projectId,
  name,
  maxOutputSize,
  relabelLLM,
}: {
  projectId: string;
  name: string;
  maxOutputSize: number;
  relabelLLM: RelabelOption;
}) => {
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedLLMRelabelCreation = prepareLLMRelabelCreation({
    nodeParams: {
      name: `${name} LLM Relabel`,
      projectId,
      config: {
        relabelLLM,
        maxLLMConcurrency: 2,
      },
    },
  });

  prismaCreations.push(...preparedLLMRelabelCreation.prismaCreations);

  const preparedArchiveCreation = prepareArchiveCreation({
    nodeParams: {
      name,
      projectId,
      config: {
        maxOutputSize,
        relabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
      },
    },
  });

  prismaCreations.push(
    ...preparedArchiveCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedArchiveCreation.entriesOutputId,
        destinationId: preparedLLMRelabelCreation.relabelNodeId,
      },
    }),
  );

  return {
    prismaCreations,
    archiveInputChannelId: preparedArchiveCreation.inputChannelId,
    archiveNodeId: preparedArchiveCreation.archiveNodeId,
    relabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
    relabeledOutputId: preparedLLMRelabelCreation.relabeledOutputId,
  };
};

export const prepareIntegratedMonitorCeation = ({
  projectId,
  initialFilters,
}: {
  projectId: string;
  initialFilters: z.infer<typeof filtersSchema>;
}) => {
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedFilterCreation = prepareFilterCreation({
    nodeParams: {
      name: "Monitor Filter",
      projectId,
      config: {
        maxLLMConcurrency: 4,
        mode: "LLM",
        skipped: true,
        filters: [],
        judgementCriteria: {
          model: RelabelOption.GPT351106,
          instructions: "Match all entries whose outputs contain errors.",
        },
      },
    },
  });

  prismaCreations.push(...preparedFilterCreation.prismaCreations);

  const preparedMonitorCreation = prepareMonitorCreation({
    nodeParams: {
      name: "New Monitor",
      projectId,
      config: {
        maxOutputSize: 500,
        sampleRate: 100,
        initialFilters,
        lastLoggedCallUpdatedAt: new Date(0),
        filterNodeId: preparedFilterCreation.filterNodeId,
      },
    },
  });

  prismaCreations.push(
    ...preparedMonitorCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedMonitorCreation.matchedLogsOutputId,
        destinationId: preparedFilterCreation.filterNodeId,
      },
    }),
  );

  return {
    prismaCreations,
    monitorNodeId: preparedMonitorCreation.monitorNodeId,
  };
};

export const prepareIntegratedDatasetCreation = ({
  projectId,
  datasetName,
}: {
  projectId: string;
  datasetName: string;
}) => {
  const datasetId = uuidv4();
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedManualRelabelCreation = prepareManualRelabelCreation({
    nodeParams: {
      name: "Dataset Manual Relabel",
      projectId,
      config: {},
    },
  });

  prismaCreations.push(...preparedManualRelabelCreation.prismaCreations);

  const preparedDatasetCreation = prepareDatasetCreation({
    nodeParams: {
      name: datasetName,
      projectId,
      config: {
        manualRelabelNodeId: preparedManualRelabelCreation.relabelNodeId,
      },
    },
  });

  const manualRelabelDatasetInputChannelId = uuidv4();

  prismaCreations.push(
    ...preparedDatasetCreation.prismaCreations,
    prisma.dataChannel.create({
      data: {
        originId: preparedManualRelabelCreation.relabeledOutputId,
        destinationId: preparedDatasetCreation.datasetNodeId,
      },
    }),
    prisma.dataset.create({
      data: {
        id: datasetId,
        name: datasetName,
        projectId,
        nodeId: preparedDatasetCreation.datasetNodeId,
      },
    }),
  );

  return {
    prismaCreations,
    datasetId,
    datasetNodeId: preparedDatasetCreation.datasetNodeId,
    datasetNodeHash: preparedDatasetCreation.datasetNodeHash,
    manualRelabelDatasetInputChannelId,
    manualRelabelNodeId: preparedManualRelabelCreation.relabelNodeId,
  };
};

export const prepareMonitorDatasetRelabelNode = ({
  projectId,
  monitorFilterMatchOutputId,
  datasetManualRelabelNodeId,
}: {
  projectId: string;
  monitorFilterMatchOutputId: string;
  datasetManualRelabelNodeId: string;
}) => {
  const prismaCreations: Prisma.PrismaPromise<unknown>[] = [];

  const preparedLLMRelabelCreation = prepareLLMRelabelCreation({
    nodeParams: {
      name: "Monitor Dataset Relabel",
      projectId,
      config: {
        relabelLLM: RelabelOption.SkipRelabel,
        maxLLMConcurrency: 2,
      },
    },
  });

  prismaCreations.push(...preparedLLMRelabelCreation.prismaCreations);

  prismaCreations.push(
    prisma.dataChannel.create({
      data: {
        originId: monitorFilterMatchOutputId,
        destinationId: preparedLLMRelabelCreation.relabelNodeId,
      },
    }),
    prisma.dataChannel.create({
      data: {
        originId: preparedLLMRelabelCreation.relabeledOutputId,
        destinationId: datasetManualRelabelNodeId,
      },
    }),
  );

  return {
    prismaCreations,
    llmRelabelNodeId: preparedLLMRelabelCreation.relabelNodeId,
  };
};
