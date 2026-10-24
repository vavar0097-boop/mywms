import { z } from "zod";

export const loginSchema = z.object({
username: z
.string()
.min(3, "Username minimum 3 characters"),

password: z
.string()
.min(4, "Password minimum 4 characters"),
});
