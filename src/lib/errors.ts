export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message)
  }
}

export function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}
