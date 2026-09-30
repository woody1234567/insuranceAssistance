export type PolicySummary = {
  id: string;
  name: string;
  status: string;
  type: string;
};

export type PolicyResponseDTO = {
  type: "text";
  intent: "list_user_policies";
  content: string;
  data: {
    totalPolicies: number;
    policies: PolicySummary[];
  };
};
