export type RequestActor = {
  type: "board" | "member" | "agent";
  id: string;
  companyIds: string[] | null;
  permissions: string[];
};
