const DEFAULT_API_BASE_URL = 'http://localhost:8200';

export interface HttpClientOptions extends RequestInit {
  readonly parseJson?: boolean;
}

export async function http<T>(path: string, options: HttpClientOptions = {}): Promise<T> {
  const { parseJson = true, headers, ...init } = options;
  // 같은 도메인에서 실행되는 경우 (통합 배포) 상대 경로 사용
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = apiBaseUrl && apiBaseUrl !== '' ? apiBaseUrl : '';
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  if (!response.ok) {
    const errorBody = await safeParse(response);
    throw new Error(errorBody?.detail ?? `API request failed with ${response.status}`);
  }

  if (!parseJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function safeParse(response: Response): Promise<{ detail?: string } | null> {
  try {
    return (await response.json()) as { detail?: string };
  } catch (error) {
    console.warn('Failed to parse API error response', error);
    return null;
  }
}
