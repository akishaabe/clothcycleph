declare module 'pg' {
  export interface QueryResult {
    rows: any[];
    rowCount: number | null;
  }

  export interface PoolClient {
    query(text: string, params?: any[]): Promise<QueryResult>;
    release(error?: Error): void;
  }

  export class Pool {
    constructor(config?: unknown);
    query(text: string, params?: any[]): Promise<QueryResult>;
    connect(): Promise<PoolClient>;
    on(event: string, listener: (error: Error) => void): this;
    end(): Promise<void>;
  }
}
