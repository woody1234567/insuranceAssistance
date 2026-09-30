export type ApiEnvelope<T> = {
  success: true;
  data: T;
  meta: {
    timestamp: number;
    requestId?: string;
  };
};

export const ApiResponse = {
  success<T>(data: T, requestId?: string): ApiEnvelope<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: Date.now(),
        ...(requestId ? { requestId } : {}),
      },
    };
  },
};
