export type ActionResponse<T> = {
    success: boolean;
    errors?: string;
    data?: T;
    message?: string;
  } | null;