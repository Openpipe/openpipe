import { TRPCError, initTRPC } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { type OpenApiMeta } from "trpc-openapi";
import { ZodError } from "zod";

import { env } from "~/env.mjs";

export const createOpenApiContext = (opts: CreateNextContextOptions) => {
  const { req } = opts;

  const dockerSecret = req.headers.authorization?.split(" ")[1] as string | null;

  if (!dockerSecret) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing Docker Secret" });
  }

  if (dockerSecret !== env.DOCKER_SECRET) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid Docker Secret" });
  }

  return {};
};

export type TRPCContext = Awaited<ReturnType<typeof createOpenApiContext>>;

const t = initTRPC
  .context<typeof createOpenApiContext>()
  .meta<OpenApiMeta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

export const createOpenApiRouter = t.router;

export const openApiPublicProc = t.procedure;
