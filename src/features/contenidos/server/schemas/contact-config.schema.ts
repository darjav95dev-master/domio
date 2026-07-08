import { z } from "zod";

export const contactConfigSchema = z.object({
  phone: z.string().min(1).max(50).nullable(),
  email: z.string().email().max(255).nullable(),
  address: z.string().min(1).max(500).nullable(),
  hours: z.string().min(1).max(200).nullable(),
  whatsappNumber: z.string().min(1).max(50).nullable(),
  whatsappPrefilledMessage: z.string().min(1).max(500).nullable(),
});
