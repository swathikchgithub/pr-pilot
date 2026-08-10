export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}
