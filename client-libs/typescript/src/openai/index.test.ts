import dotenv from "dotenv";
import { expect, test } from "vitest";
import OpenAI from "../openai";
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat/completions";
import { OPClient } from "../codegen";
import mergeChunks from "./mergeChunks";
import assert from "assert";

dotenv.config();

const oaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  openpipe: {
    apiKey: process.env.OPENPIPE_API_KEY,
    baseUrl: "http://localhost:3000/api/v1",
  },
});

const opClient = new OPClient({
  BASE: "http://localhost:3000/api/v1",
  TOKEN: process.env.OPENPIPE_API_KEY,
});

const lastLoggedCall = async () => opClient.default.localTestingOnlyGetLatestLoggedCall();

test("basic call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: { tags: { promptId: "test" } },
  });
  await completion.openpipe.reportingFinished;
  const lastLogged = await lastLoggedCall();

  expect(lastLogged?.reqPayload).toMatchObject(payload);
  expect(completion).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.tags).toMatchObject({ promptId: "test" });
});

test("streaming", async () => {
  const completion = await oaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "count to 3" }],
    stream: true,
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    merged = mergeChunks(merged, chunk);
  }

  const lastLogged = await lastLoggedCall();
  await completion.openpipe.reportingFinished;

  expect(merged).toMatchObject(lastLogged?.respPayload);
  expect(lastLogged?.reqPayload.messages).toMatchObject([
    { role: "system", content: "count to 3" },
  ]);
});

test("bad call streaming", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "gpt-3.5-turbo-blaster",
      messages: [{ role: "system", content: "count to 10" }],
      stream: true,
    });
  } catch (e) {
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.errorMessage).toEqual(
      "404 The model `gpt-3.5-turbo-blaster` does not exist",
    );
    expect(lastLogged?.statusCode).toEqual(404);
  }
});

test("bad call", async () => {
  try {
    await oaiClient.chat.completions.create({
      model: "gpt-3.5-turbo-buster",
      messages: [{ role: "system", content: "count to 10" }],
    });
  } catch (e) {
    // @ts-expect-error need to check for error type
    assert("openpipe" in e);
    // @ts-expect-error need to check for error type
    await e.openpipe.reportingFinished;
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.errorMessage).toEqual("404 The model `gpt-3.5-turbo-buster` does not exist");
    expect(lastLogged?.statusCode).toEqual(404);
  }
});
