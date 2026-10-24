import axios from "axios";

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;

    return responseMessage || "Request failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}