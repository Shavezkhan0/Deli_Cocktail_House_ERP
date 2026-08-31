# PDF branding assets

Drop image files here and the salary‑slip / payroll‑summary PDFs pick them up
automatically. Excel (`.csv`) exports never include images.

| File | Used for | Notes |
|------|----------|-------|
| `company-logo.png` | Logo at the top of every PDF | PNG or JPEG. `.jpg` / `.jpeg` also accepted. Square-ish works best (rendered ~44 px tall). |
| `company-stamp.png` | Round stamp/seal over the "Employer Signature" on the salary slip | PNG with transparent background looks best. Rendered ~76 px, at 70% opacity. |

**Shipped:** `company-logo.png` and `company-stamp.png` are the D.C.H gold emblem
copied from `apps/employee_mobile/assets/icon/app_icon_foreground.png` (the mobile app
splash logo). Replace either file to change the branding. The source is 1254×1254 (~0.9 MB);
if PDF size matters, drop in a smaller (e.g. 256 px) PNG under the same name.

If no file is present:
- the **logo** falls back to `PdfCompanySettings.logoUrl` / `headerLogoUrl` (must be a
  publicly reachable PNG/JPEG URL), and if that is empty too, a built‑in vector
  martini‑glass mark is drawn.
- the **stamp** falls back to a built‑in vector seal (company initials + "PAYROLL DEPT").

The stamp is on by default for the individual salary slip. Turn it off per download
with `?stamp=0` on `GET /api/office/employees/:id/salary-slip`.

## Making a PNG from the reference art

`company-logo.svg` and `company-stamp.svg` in this folder are editable source art.
pdfkit cannot embed SVG, so export them to PNG (any of):

- open the `.svg` in a browser / Figma / Illustrator and export PNG, or
- `npx --yes svgexport company-logo.svg company-logo.png 512:`

Then save the PNG in this folder with the exact name from the table above.