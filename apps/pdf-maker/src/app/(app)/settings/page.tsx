import { prisma } from "@repo/database";
import { SettingsForm } from "@/components/settings/settings-form";
import { toLines } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await prisma.pdfCompanySettings.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const initial = settings
    ? {
        companyName: settings.companyName,
        logoUrl: settings.logoUrl ?? "",
        headerLogoUrl: settings.headerLogoUrl ?? "",
        address: settings.address ?? "",
        phone1: settings.phone1 ?? "",
        phone2: settings.phone2 ?? "",
        email: settings.email ?? "",
        footerText: settings.footerText ?? "",
        defaultFont: settings.defaultFont,
        defaultTheme: settings.defaultTheme,
        defaultTerms: settings.defaultTerms ?? "",
        defaultDeliverables: toLines(settings.defaultDeliverables as string[] | null),
        defaultMixers: toLines(settings.defaultMixers as string[] | null),
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Company Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Branding and global defaults used when generating event proposals.
        </p>
      </div>

      <SettingsForm initial={initial} />
    </div>
  );
}
