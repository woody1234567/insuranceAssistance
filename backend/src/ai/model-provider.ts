import { createGoogleVertex } from "@ai-sdk/google-vertex";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { env } from "../config/env.js";

export function createAIModel(modelName: string = env.AI_MODEL): LanguageModel {
  if (env.AI_PROVIDER === "google") {
    const google = createGoogleGenerativeAI({
      apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
    });
    return google(modelName);
  }

  const vertex = createGoogleVertex({
    project: env.GOOGLE_VERTEX_PROJECT,
    location: env.GOOGLE_VERTEX_LOCATION,
    googleAuthOptions: env.GOOGLE_APPLICATION_CREDENTIALS
      ? { keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS }
      : undefined,
  });

  return vertex(modelName);
}
