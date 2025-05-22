import type { FileMap } from '~/lib/stores/files';

export interface Snapshot {
  chatIndex: string;
  files: FileMap;
  summary?: string;
}

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages?: any[];
  timestamp?: string | number;
  updatedAt?: string | number;
  metadata?: any;
}
