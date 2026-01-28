export interface AITool {
  name: string;
  description: string;
  getSystemPrompt(): string;
  execute(query: string, context: ToolContext): Promise<ToolResponse>;
}

export interface ToolContext {
  phoneNumber: string;
  sessionState: any;
  senderName?: string;
}

export interface ToolResponse {
  success: boolean;
  reply: string;
  newState?: any;
}

export enum BotIntent {
  IDENTITY = 'IDENTITY',
  CREATE_FORM = 'CREATE_FORM',
  CHECK_SCHEDULE = 'CHECK_SCHEDULE',
  CHECK_RESPONSES = 'CHECK_RESPONSES',
  ACKNOWLEDGMENT = 'ACKNOWLEDGMENT',
  CLARIFICATION = 'CLARIFICATION',
  UNKNOWN = 'UNKNOWN'
}
