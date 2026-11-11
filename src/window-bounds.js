// Keeps cue's main column fully on a display's work area, so the drag handle at
// the top can never end up off-screen (a window at y=-70 could not be grabbed).
// The window is SIDE_W + MAIN_W + SIDE_W wide; only the middle column must fit.

/**
 * @param {{x:number,y:number}} pos window top-left
 * @param {{x:number,y:number,width:number,height:number}} area display work area
 * @param {{sideW:number, mainW:number, height:number}} size
 * @returns {{x:number,y:number}}
 */
function clampWindowPosition(pos, area, size) {
  const minX = area.x - size.sideW;
  const maxX = area.x + area.width - size.mainW - size.sideW;
  const minY = area.y;
  const maxY = Math.max(area.y, area.y + area.height - size.height);
  return {
    x: Math.round(Math.min(Math.max(pos.x, minX), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(pos.y, minY), maxY)),
  };
}

module.exports = { clampWindowPosition };
