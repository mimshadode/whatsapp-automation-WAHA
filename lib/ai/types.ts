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
  messageId?: string;
  replyContext?: string; // Text content of the message being replied to
  sender?: string; // Sender's JID (for authorization checks)
  mentionedUsers?: string[]; // Mentioned user JIDs
}

export interface ToolResponse {
  success: boolean;
  reply: string;
  newState?: any;
}

export enum BotIntent {
  IDENTITY = 'IDENTITY',
  CREATE_FORM = 'CREATE_FORM',
  UPDATE_FORM = 'UPDATE_FORM',
  CHECK_SCHEDULE = 'CHECK_SCHEDULE',
  CHECK_RESPONSES = 'CHECK_RESPONSES',
  SHARE_FORM = 'SHARE_FORM',
  GRANT_ACCESS = 'GRANT_ACCESS',
  ACKNOWLEDGMENT = 'ACKNOWLEDGMENT',
  CLARIFICATION = 'CLARIFICATION',
  GENERAL_QA = 'GENERAL_QA',
  UNKNOWN = 'UNKNOWN'
}
