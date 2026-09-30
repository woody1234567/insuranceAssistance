import swaggerJSDoc, { type Options } from "swagger-jsdoc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDefinition: Options["swaggerDefinition"] = {
  openapi: "3.0.0",
  info: {
    title: "智慧保險諮詢助理 API (Insurance Assistance API)",
    version: "1.0.0",
    description: "智慧保險諮詢助理後端 API 文件，包含智慧對話助理、保單查詢、理賠文件諮詢與理賠申請導引等功能。",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: "/",
      description: "當前伺服器",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "Better Auth Session Cookie (`better-auth.session_token`)",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Better Auth Bearer Token (Authorization: Bearer <token>)",
      },
    },
    schemas: {
      ApiSuccessMeta: {
        type: "object",
        properties: {
          timestamp: {
            type: "integer",
            example: 1727712000000,
          },
          requestId: {
            type: "string",
            example: "c79f9797-2a5d-4f1f-9bca-c3cfd619965d",
          },
        },
        required: ["timestamp"],
      },
      ApiErrorDetail: {
        type: "object",
        properties: {
          field: {
            type: "string",
            example: "message",
          },
          issue: {
            type: "string",
            example: "String must contain at least 1 character(s)",
          },
        },
        required: ["field", "issue"],
      },
      ApiErrorResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                example: "VALIDATION_FAILED",
              },
              message: {
                type: "string",
                example: "請求參數驗證失敗",
              },
              details: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/ApiErrorDetail",
                },
              },
            },
            required: ["code", "message"],
          },
          meta: {
            $ref: "#/components/schemas/ApiSuccessMeta",
          },
        },
        required: ["success", "error", "meta"],
      },
      PolicySummary: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "ins-acc-001",
          },
          name: {
            type: "string",
            example: "安心守護傷害保險",
          },
          status: {
            type: "string",
            example: "ACTIVE",
          },
          type: {
            type: "string",
            example: "ACCIDENT",
          },
        },
        required: ["id", "name", "status", "type"],
      },
      PolicyData: {
        type: "object",
        properties: {
          totalPolicies: {
            type: "integer",
            example: 2,
          },
          policies: {
            type: "array",
            items: {
              $ref: "#/components/schemas/PolicySummary",
            },
          },
        },
        required: ["totalPolicies", "policies"],
      },
      PolicyResponseDTO: {
        type: "object",
        properties: {
          type: {
            type: "string",
            example: "text",
          },
          intent: {
            type: "string",
            example: "list_user_policies",
          },
          content: {
            type: "string",
            example: "您目前共有 2 張有效保單：安心守護傷害保險、康健醫療保險。",
          },
          data: {
            $ref: "#/components/schemas/PolicyData",
          },
        },
        required: ["type", "intent", "content", "data"],
      },
      ClaimDocument: {
        type: "object",
        properties: {
          name: {
            type: "string",
            example: "醫療診斷證明書",
          },
          isOriginalRequired: {
            type: "boolean",
            example: true,
          },
          description: {
            type: "string",
            example: "需註明入出院日期與醫師簽章",
          },
        },
        required: ["name", "isOriginalRequired", "description"],
      },
      ClaimRequirementsData: {
        type: "object",
        properties: {
          claimType: {
            type: "string",
            example: "住院",
          },
          requiredDocuments: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ClaimDocument",
            },
          },
          notes: {
            type: "array",
            items: {
              type: "string",
            },
            example: ["請於出院後 10 日內備齊文件提出申請"],
          },
        },
        required: ["claimType", "requiredDocuments", "notes"],
      },
      ClaimRequirementsResponseDTO: {
        type: "object",
        properties: {
          type: {
            type: "string",
            example: "text",
          },
          intent: {
            type: "string",
            example: "claim_required_documents",
          },
          content: {
            type: "string",
            example: "申請住院理賠需要以下文件：醫療診斷證明書、收據正本。",
          },
          data: {
            $ref: "#/components/schemas/ClaimRequirementsData",
          },
        },
        required: ["type", "intent", "content", "data"],
      },
      StartClaimResponseDTO: {
        type: "object",
        properties: {
          type: {
            type: "string",
            example: "action",
          },
          intent: {
            type: "string",
            example: "start_claim",
          },
          action: {
            type: "string",
            example: "NAVIGATE",
          },
          payload: {
            type: "object",
            properties: {
              route: {
                type: "string",
                example: "/claims/apply",
              },
              params: {
                type: "object",
                properties: {
                  availablePolicyIds: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                    example: ["ins-acc-001", "ins-med-002"],
                  },
                },
                required: ["availablePolicyIds"],
              },
            },
            required: ["route", "params"],
          },
          message: {
            type: "string",
            example: "已為您準備好理賠申請，請點選按鈕前往填寫表單。",
          },
        },
        required: ["type", "intent", "action", "payload", "message"],
      },
      UnknownIntentResponseDTO: {
        type: "object",
        properties: {
          type: {
            type: "string",
            example: "text",
          },
          intent: {
            type: "string",
            example: "unknown",
          },
          content: {
            type: "string",
            example: "抱歉，我不太理解您的需求。您可以詢問保單資訊或理賠流程。",
          },
          data: {
            type: "object",
            example: {},
          },
        },
        required: ["type", "intent", "content", "data"],
      },
      AssistantMessageRequest: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "使用者輸入的諮詢訊息",
            example: "我想知道我有幾張保單？",
          },
        },
        required: ["message"],
      },
      HealthCheckData: {
        type: "object",
        properties: {
          status: {
            type: "string",
            example: "ok",
          },
          database: {
            type: "string",
            example: "ok",
          },
        },
        required: ["status", "database"],
      },
    },
  },
};

const options: Options = {
  swaggerDefinition,
  apis: [
    path.resolve(__dirname, "../routes/*.ts"),
    path.resolve(__dirname, "../routes/*.js"),
    path.resolve(__dirname, "./swagger.ts"),
    path.resolve(__dirname, "./swagger.js"),
    path.resolve(__dirname, "../app.ts"),
    path.resolve(__dirname, "../app.js"),
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
