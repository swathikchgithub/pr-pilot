import { ArgumentsHost, BadRequestException } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe("HttpExceptionFilter", () => {
  it("passes through a NestJS HttpException's status and message", () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = mockHost();

    filter.catch(new BadRequestException("email is required"), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ statusCode: 400, error: "Bad Request", message: "email is required" });
  });

  it("masks unknown errors as a generic 500 with no stack trace leaked", () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = mockHost();

    filter.catch(new Error("connection string invalid: postgres://user:pw@host"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
  });
});
