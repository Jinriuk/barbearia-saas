import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const MAX_TENANT_ASSET_BYTES = 4 * 1024 * 1024; // logo/fundo
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // fotos de perfil/produto

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/**
 * Upload de imagem para o bucket público, com validação de tipo e tamanho.
 * O `path` deve seguir os prefixos cobertos pelas policies de storage:
 * `{tenantId}/...` (logo/fundo), `professionals/{tenantId}/...` e
 * `products/{tenantId}/...`.
 */
export async function uploadPublicImage(
  file: File,
  path: string,
  maxBytes: number,
): Promise<{ url: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo de imagem." };
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Formato inválido. Use PNG, JPG ou WebP." };
  }
  if (file.size > maxBytes) {
    return {
      error: `Imagem muito grande. O limite é ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    };
  }
  const supabase = await createSupabaseServerClient();
  const fullPath = `${path}-${Date.now()}.${extensionFor(file.type)}`;
  const { error } = await supabase.storage
    .from("public-assets")
    .upload(fullPath, file, { cacheControl: "3600", upsert: true });
  if (error) {
    return { error: "Não foi possível enviar a imagem. Tente novamente." };
  }
  const { data } = supabase.storage
    .from("public-assets")
    .getPublicUrl(fullPath);
  return { url: data.publicUrl };
}
