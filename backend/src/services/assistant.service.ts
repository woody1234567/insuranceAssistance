import type { AssistantResponseDTO } from "../models/dtos/assistant.dto.js";
import type { IntentClassifier } from "../ai/intent-classifier.js";
import { IntentRouter } from "../ai/intent-router.js";

export class AssistantService {
  private readonly classifier: IntentClassifier;
  private readonly router: IntentRouter;

  public constructor(classifier: IntentClassifier, router: IntentRouter) {
    this.classifier = classifier;
    this.router = router;
  }

  public async handleMessage(userId: string, message: string): Promise<AssistantResponseDTO> {
    const classification = await this.classifier.classify(message);
    return this.router.route(userId, classification);
  }
}
