import { createBrowserClient } from "@supabase/ssr";

const PRODUCT_IMAGES_BUCKET = "product-images";
const PRODUCT_IMAGE_SIZE = 250;

function createSupabaseBrowserClient() {
  return createBrowserClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
}

async function resizeImageToSquare(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const minSide = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - minSide) / 2;
  const sy = (bitmap.height - minSide) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(bitmap, sx, sy, minSide, minSide, 0, 0, size, size);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem."))),
      "image/jpeg",
      0.9,
    );
  });
}

export async function uploadProductImage(organizationId: string, file: File): Promise<string> {
  const resized = await resizeImageToSquare(file, PRODUCT_IMAGE_SIZE);
  const path = `${organizationId}/${crypto.randomUUID()}.jpg`;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, resized, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
