import dotenv from "dotenv";
import { expect, test } from "vitest";
import BaseOpenAI, { APIError } from "openai";
import { sleep } from "openai/core";
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat/completions";
import assert from "assert";

import OpenAI from "../openai";
import { OPClient } from "../codegen";
import mergeChunks from "./mergeChunks";
import { getTags } from "../shared";
import { OPENPIPE_API_KEY, OPENPIPE_BASE_URL, TEST_LAST_LOGGED } from "../testConfig";
import { functionBody } from "../sharedTestInput";

dotenv.config();

const baseClient = new BaseOpenAI({
  apiKey: OPENPIPE_API_KEY,
  baseURL: OPENPIPE_BASE_URL,
});

const oaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  openpipe: {
    apiKey: OPENPIPE_API_KEY,
    baseUrl: OPENPIPE_BASE_URL,
  },
});

const opClient = new OPClient({
  BASE: OPENPIPE_BASE_URL,
  TOKEN: OPENPIPE_API_KEY,
});

const lastLoggedCall = async () => opClient.default.localTestingOnlyGetLatestLoggedCall();

const randomLetters = Math.random().toString(36).substring(7);

test("simple ft tool call", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "tell me the weather in SF and Orlando" }],
    tools: [
      {
        type: "function",
        function: functionBody,
      },
    ],
  };
  const completion = await oaiClient.chat.completions.create(payload);
  console.log(completion.choices[0].message);
  await sleep(100);
  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
    expect(completion).toMatchObject(lastLogged?.respPayload);
  }
}, 100000);

test.only("tool call streaming", async () => {
  const payload: ChatCompletionCreateParams = {
    model: "openpipe:test-tool-calls-mistral-p3",
    // model: "gpt-3.5-turbo",
    messages: [{ role: "system", content: "Tell me the weather in SF and Orlando" }],
    tools: [
      {
        type: "function",
        function: functionBody,
      },
    ],
    stream: true,
  };
  const completion = await oaiClient.chat.completions.create({
    ...payload,
    openpipe: {
      tags: { promptId: "tool call streaming" },
    },
  });

  let merged: ChatCompletion | null = null;
  for await (const chunk of completion) {
    console.log(chunk.choices[0].delta.tool_calls);

    merged = mergeChunks(merged, chunk);
  }

  await completion.openpipe?.reportingFinished;

  if (TEST_LAST_LOGGED) {
    const lastLogged = await lastLoggedCall();
    expect(merged).toMatchObject(lastLogged?.respPayload);
    expect(lastLogged?.reqPayload.messages).toMatchObject(payload.messages);
  }
});
