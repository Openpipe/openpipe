import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";
import { requireCanModifyDataset, requireCanViewDataset } from "~/utils/accessControl";
import { autogenerateDatasetEntries } from "../autogenerate/autogenerateDatasetEntries";

export const datasetEntries = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ datasetId: z.string(), page: z.number(), pageSize: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireCanViewDataset(input.datasetId, ctx);

      const { datasetId, page, pageSize } = input;

      const entries = await prisma.datasetEntry.findMany({
        where: {
          datasetId,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const count = await prisma.datasetEntry.count({
        where: {
          datasetId,
        },
      });

      return {
        entries,
        startIndex: (page - 1) * pageSize + 1,
        lastPage: Math.ceil(count / pageSize),
        count,
      };
    }),
  createOne: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        input: z.string(),
        output: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyDataset(input.datasetId, ctx);

      return await prisma.datasetEntry.create({
        data: {
          datasetId: input.datasetId,
          input: input.input,
          output: input.output,
        },
      });
    }),

  autogenerateEntries: protectedProcedure
    .input(
      z.object({
        datasetId: z.string(),
        numToGenerate: z.number(),
        inputDescription: z.string(),
        outputDescription: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireCanModifyDataset(input.datasetId, ctx);

      const dataset = await prisma.dataset.findUnique({
        where: {
          id: input.datasetId,
        },
      });

      if (!dataset) {
        throw new Error(`Dataset with id ${input.datasetId} does not exist`);
      }

      const entries = await autogenerateDatasetEntries(
        input.numToGenerate,
        input.inputDescription,
        input.outputDescription,
      );

      const createdEntries = await prisma.datasetEntry.createMany({
        data: entries.map((entry) => ({
          datasetId: input.datasetId,
          input: entry.input,
          output: entry.output,
        })),
      });

      return createdEntries;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const datasetId = (
        await prisma.datasetEntry.findUniqueOrThrow({
          where: { id: input.id },
        })
      ).datasetId;

      await requireCanModifyDataset(datasetId, ctx);

      return await prisma.datasetEntry.delete({
        where: {
          id: input.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
          input: z.string(),
          output: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.datasetEntry.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!existing) {
        throw new Error(`dataEntry with id ${input.id} does not exist`);
      }

      await requireCanModifyDataset(existing.datasetId, ctx);

      return await prisma.datasetEntry.update({
        where: {
          id: input.id,
        },
        data: {
          input: input.updates.input,
          output: input.updates.output,
        },
      });
    }),
});
