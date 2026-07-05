import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class HttpClientService {
  async get<T>(url: string): Promise<T> {
    const response = await axios.get<T>(url, { timeout: Number(process.env.HTTP_CLIENT_TIMEOUT_MS ?? 3000) });
    return response.data;
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    const response = await axios.post<T>(url, body, { timeout: Number(process.env.HTTP_CLIENT_TIMEOUT_MS ?? 3000) });
    return response.data;
  }

  async patch<T>(url: string, body: unknown): Promise<T> {
    const response = await axios.patch<T>(url, body, { timeout: Number(process.env.HTTP_CLIENT_TIMEOUT_MS ?? 3000) });
    return response.data;
  }
}

