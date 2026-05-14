const TILE_W = 64;
const TILE_H = 32;
const WORLD_TILES = 40;

function worldToScreen(worldX, worldY) {
  return {
    x: (worldX - worldY) * (TILE_W / 2),
    y: (worldX + worldY) * (TILE_H / 2),
  };
}

function screenToWorld(screenX, screenY) {
  return {
    x: (screenX / (TILE_W / 2) + screenY / (TILE_H / 2)) / 2,
    y: (screenY / (TILE_H / 2) - screenX / (TILE_W / 2)) / 2,
  };
}
