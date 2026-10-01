import { Assets, Texture } from "pixi.js";

/**
 * Obtém uma textura de forma segura, evitando exceções no PixiJS.
 */
export function getGameTexture(aliasOrPath: string): Texture {
  if (!aliasOrPath) return Texture.WHITE;

  // 1. Alias direto no Assets cache
  let texture = Assets.get(aliasOrPath);
  if (texture && texture !== Texture.EMPTY) return texture;

  // 2. Caminhos padrão de busca
  const pathsToTry = [
    aliasOrPath,
    `/assets/png/default/ships/${aliasOrPath}.png`,
    `/assets/png/default/tiles/${aliasOrPath}.png`,
    `/assets/png/default/ship_parts/${aliasOrPath}.png`,
    `/assets/png/default/ui/controls/${aliasOrPath}.png`,
    `/assets/png/default/ui/hud/${aliasOrPath}.png`,
  ];

  for (const path of pathsToTry) {
    texture = Assets.get(path);
    if (texture && texture !== Texture.EMPTY) return texture;
  }

  // 3. Tenta carregar via Texture.from
  try {
    const fallback = Texture.from(aliasOrPath);
    if (fallback && fallback !== Texture.EMPTY) return fallback;
  } catch {
    console.warn(
      `[TextureUtils] Falha ao recuperar textura para: ${aliasOrPath}`,
    );
  }

  return Texture.WHITE;
}
