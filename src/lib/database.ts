const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

interface QueryBuilder<T = any> {
  select(columns?: string): QueryBuilder<T>;
  insert(data: any[]): QueryBuilder<T>;
  update(data: any): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  eq(column: string, value: any): QueryBuilder<T>;
  neq(column: string, value: any): QueryBuilder<T>;
  in(column: string, values: any[]): QueryBuilder<T>;
  or(query: string): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  maybeSingle(): Promise<{ data: T | null; error: any }>;
  single(): Promise<{ data: T; error: any }>;
  gte(column: string, value: any): QueryBuilder<T>;
  lte(column: string, value: any): QueryBuilder<T>;
  then(resolve: (value: { data: T[] | null; error: any; count?: number }) => void, reject?: (reason: any) => void): Promise<any>;
}

class PostgresQueryBuilder<T = any> implements QueryBuilder<T> {
  private tableName: string;
  private selectCols = '*';
  private filters: Array<{ type: string; column?: string; value?: any; query?: string }> = [];
  private orderBy: Array<{ column: string; ascending: boolean }> = [];
  private limitCount?: number;
  private rangeStart?: number;
  private rangeEnd?: number;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertData?: any[];
  private updateData?: any;
  private shouldCount = false;

  constructor(table: string, options?: { count?: string }) {
    this.tableName = table;
    if (options?.count === 'exact') {
      this.shouldCount = true;
    }
  }

  select(columns = '*'): QueryBuilder<T> {
    this.selectCols = columns;
    this.operation = 'select';
    return this;
  }

  insert(data: any[]): QueryBuilder<T> {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any): QueryBuilder<T> {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  delete(): QueryBuilder<T> {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }


  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    this.orderBy.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): QueryBuilder<T> {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }
  gte(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  or(query: string): QueryBuilder<T> {
    this.filters.push({ type: 'or', query });
    return this;
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      const token = getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      if (this.selectCols !== '*') params.append('select', this.selectCols);
      if (this.shouldCount) params.append('count', 'exact');
      if (this.limitCount) params.append('limit', String(this.limitCount));
      if (this.rangeStart !== undefined) params.append('offset', String(this.rangeStart));
      if (this.rangeEnd !== undefined) params.append('limit', String(this.rangeEnd - this.rangeStart + 1));

      this.filters.forEach((f, i) => {
        if (f.type === 'eq') params.append(`filter_${i}`, `${f.column}:eq:${f.value}`);
        else if (f.type === 'neq') params.append(`filter_${i}`, `${f.column}:neq:${f.value}`);
        else if (f.type === 'gte') params.append(`filter_${i}`, `${f.column}:gte:${f.value}`);
        else if (f.type === 'lte') params.append(`filter_${i}`, `${f.column}:lte:${f.value}`);
        else if (f.type === 'in') params.append(`filter_${i}`, `${f.column}:in:${JSON.stringify(f.value)}`);
        else if (f.type === 'or') params.append(`or`, f.query || '');
      });

      this.orderBy.forEach((o, i) => {
        params.append(`order_${i}`, `${o.column}:${o.ascending ? 'asc' : 'desc'}`);
      });

      let url = `${API_URL}/db/${this.tableName}`;
      let method = 'GET';
      let body: string | undefined;

      if (this.operation === 'insert') {
        method = 'POST';
        body = JSON.stringify(this.insertData);
      } else if (this.operation === 'update') {
        method = 'PATCH';
        body = JSON.stringify({ data: this.updateData, filters: this.filters });
      } else if (this.operation === 'delete') {
        method = 'DELETE';
        body = JSON.stringify({ filters: this.filters });
      } else {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, { method, headers, body });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        return { data: null, error: error.error || `HTTP ${response.status}` };
      }

      const result = await response.json();
      return {
        data: result.data,
        error: null,
        count: result.count
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async maybeSingle(): Promise<{ data: T | null; error: any }> {
    const result = await this.execute();
    if (result.error) return { data: null, error: result.error };
    const data = Array.isArray(result.data) ? result.data[0] : result.data;
    return { data: data || null, error: null };
  }

  async single(): Promise<{ data: T; error: any }> {
    const result = await this.execute();
    if (result.error) return { data: null as any, error: result.error };
    const data = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!data) return { data: null as any, error: 'No data found' };
    return { data, error: null };
  }

  then(resolve: (value: { data: any; error: any; count?: number }) => void, reject?: (reason: any) => void): Promise<any> {
    return this.execute().then(resolve, reject);
  }
}

class Database {
  from<T = any>(table: string, options?: { count?: string }): QueryBuilder<T> {
    return new PostgresQueryBuilder<T>(table, options);
  }

  rpc(functionName: string, params?: any): { single: () => Promise<{ data: any; error: any }> } {
    return {
      single: async () => {
        try {
          const token = getAuthToken();
          const response = await fetch(`${API_URL}/db/rpc/${functionName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(params || {})
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            return { data: null, error: error.error };
          }

          const result = await response.json();
          return { data: result.data, error: null };
        } catch (error: any) {
          return { data: null, error: error.message };
        }
      }
    };
  }

  auth = {
    getSession: async () => {
      const token = getAuthToken();
      return {
        data: {
          session: token ? { access_token: token } : null
        },
        error: null
      };
    }
  };
}

export const supabase = new Database();
