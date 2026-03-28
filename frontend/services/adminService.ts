import { apiClient } from "@/lib/api/client";
import type { LLMConfig } from "@/types";

export const adminService = {
  getLLMConfig: () => apiClient.get<LLMConfig>("/admin/llm-config"),
  updateLLMConfig: (body: { llm_base_url?: string; llm_model?: string; chat_llm_base_url?: string; chat_llm_model?: string }) =>
    apiClient.put<LLMConfig>("/admin/llm-config", body),
};
