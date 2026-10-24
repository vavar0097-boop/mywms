import { Response } from "express";

export function successResponse(
res: Response,
data: unknown,
message = "Success"
) {
return res.status(200).json({
success: true,
message,
data,
});
}

export function createdResponse(
res: Response,
data: unknown,
message = "Created"
) {
return res.status(201).json({
success: true,
message,
data,
});
}
