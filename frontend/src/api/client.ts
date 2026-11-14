const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  public clearAuthToken(): void {
    localStorage.removeItem('access_token');
  }

  public isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }

  private decodeToken(token: string): { exp?: number } | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  public isTokenExpired(): boolean {
    const token = this.getAuthToken();
    if (!token) return true;

    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  public validateToken(): boolean {
    if (!this.isAuthenticated()) return false;
    if (this.isTokenExpired()) {
      this.clearAuthToken();
      return false;
    }
    return true;
  }

  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      if ('detail' in error) {
        const detail = (error as { detail: unknown }).detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail.length > 0) {
          return detail.map(d => typeof d === 'string' ? d : JSON.stringify(d)).join(', ');
        }
      }
      if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
        return (error as { message: string }).message;
      }
    }
    return 'Request failed';
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuthToken();
          throw new Error('Session expired. Please login again.');
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(this.extractErrorMessage(error) || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Network error - is the backend running?');
    }
  }

  public async login(username: string, password: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(this.extractErrorMessage(error) || 'Invalid credentials');
      }

      const data = await response.json();
      this.setAuthToken(data.access_token);
      return data.access_token;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Network error - is the backend running?');
    }
  }

  public async register(username: string, email: string, password: string): Promise<void> {
    await this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  public async getCurrentUser<T>(): Promise<T> {
    return this.request<T>('/api/v1/auth/me');
  }

  public async getQuizQuestions<T>(levelId: number): Promise<T> {
    return this.request<T>(`/api/v1/quiz/${levelId}/questions`);
  }

  public async submitQuiz<T>(levelId: number, answers: Record<number, number>, timeSpent: number): Promise<T> {
    return this.request<T>(`/api/v1/quiz/${levelId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        level_id: levelId,
        answers,
        time_spent: timeSpent,
      }),
    });
  }

  public async getUserProgress<T>(): Promise<T> {
    return this.request<T>('/api/v1/progress');
  }

  public async getLevels<T>(): Promise<T> {
    return this.request<T>('/api/v1/levels');
  }

  // Achievement methods
  public async getUserStats<T>(): Promise<T> {
    return this.request<T>('/api/v1/achievements/stats');
  }

  public async getUserAchievements<T>(): Promise<T> {
    return this.request<T>('/api/v1/achievements');
  }

  public async getAllAchievements<T>(): Promise<T> {
    return this.request<T>('/api/v1/achievements/all');
  }

  public async processDailyLogin<T>(): Promise<T | null> {
    return this.request<T>('/api/v1/achievements/daily-login', {
      method: 'POST',
    });
  }

  public async getStoryProgress<T>(): Promise<T> {
    return this.request<T>('/api/v1/achievements/story-progress');
  }

  public async updateStoryProgress<T>(update: Record<string, boolean>): Promise<T> {
    return this.request<T>('/api/v1/achievements/story-progress', {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  public async getXPHistory<T>(limit: number = 20): Promise<T> {
    return this.request<T>(`/api/v1/achievements/xp-history?limit=${limit}`);
  }
}

export const apiClient = new ApiClient();
