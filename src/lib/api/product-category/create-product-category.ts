import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils/slug";

const createProductCategorySchema = z.object({
  organizationId: z.uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres."),
  description: z.string().trim().optional(),
  displayLimit: z.number().int().min(1).optional(),
});

export type CreateProductCategoryProps = z.infer<typeof createProductCategorySchema>;

function toOptionalString(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function generateUniqueSlug(organizationId: string, name: string) {
  const base = slugify(name) || "categoria";
  const existingSlugs = new Set(
    (
      await prisma.productCategory.findMany({
        where: { organizationId, slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((c) => c.slug),
  );

  let slug = base;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

const createProductCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createProductCategorySchema.parse(input))
  .handler(async ({ data }) => {
    const existingCount = await prisma.productCategory.count({
      where: { organizationId: data.organizationId },
    });

    const slug = await generateUniqueSlug(data.organizationId, data.name);

    const category = await prisma.productCategory.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        slug,
        description: toOptionalString(data.description),
        displayOrder: existingCount,
        displayLimit: data.displayLimit ?? null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        displayOrder: true,
        displayLimit: true,
      },
    });

    return category;
  });

export async function createProductCategory(data: CreateProductCategoryProps) {
  return createProductCategoryServerFn({ data });
}
