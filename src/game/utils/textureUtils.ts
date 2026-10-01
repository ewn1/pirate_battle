import { Assets, Texture } from "pixi.js";

/**
 * Busca uma textura no PixiJS testando todas as combinações de chaves e caminhos possíveis.
 */
export function getGameTexture(aliasOrPath: string): Texture {
  if (!aliasOrPath) return Texture.EMPTY;

  // 1. Tenta buscar direto pelo alias (ex: "ship_1")
  let texture = Assets.get(aliasOrPath);
  if (texture && texture !== Texture.EMPTY) return texture;

  // 2. Tenta buscar adicionando o caminho de navios padrão
  const shipPath = `/assets/png/default/ships/${aliasOrPath}.png`;
  texture = Assets.get(shipPath);
  if (texture && texture !== Texture.EMPTY) return texture;

  // 3. Tenta carregar via Texture.from usando o caminho público correto
  try {
    const fallback = Texture.from(
      aliasOrPath.startsWith("/") ? aliasOrPath : shipPath,
    );
    if (fallback) return fallback;
  } catch {
    console.warn(`[TextureUtils] Falha ao carregar textura: ${aliasOrPath}`);
  }

  return Texture.EMPTY;
}
