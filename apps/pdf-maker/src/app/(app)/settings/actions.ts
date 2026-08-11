"use server";

import { prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/session";

export type SettingsInput = {
  companyName?: string;
  logoUrl?: string;
  headerLogoUrl?: string;
  address?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  footerText?: string;
  defaultFont?: string;
  defaultTheme?: string;
  defaultTerms?: string;
  defaultDeliverables?: string[];
  defaultMixers?: string[];
};

export async function saveSettings(
  input: SettingsInput,
): Promise<{ ok: true }> {
  await requireAuth();

  const existing = await prisma.pdfCompanySettings.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const data = {
    companyName: input.companyName ?? "",
    logoUrl: input.logoUrl?.trim() || null,
    headerLogoUrl: input.headerLogoUrl?.trim() || null,
    address: input.address?.trim() || null,
    phone1: input.phone1?.trim() || null,
    phone2: input.phone2?.trim() || null,
    email: input.email?.trim() || null,
    footerText: input.footerText?.trim() || null,
    defaultFont: input.defaultFont || "Helvetica",
    defaultTheme: input.defaultTheme || "modern",
    defaultTerms: input.defaultTerms?.trim() || null,
    defaultDeliverables: input.defaultDeliverables ?? [],
    defaultMixers: input.defaultMixers ?? [],
  };

  if (existing) {
    await prisma.pdfCompanySettings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.pdfCompanySettings.create({ data });
  }

  revalidatePath("/settings");
  return { ok: true };
}
