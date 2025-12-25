/*
  Usage:
   import { TextCursor } from "./textcursor.js";
   txtcrsr = new TextCursor(elemToAddCursorTo, "text for speech bubble", args={})
   txtcrsr.set_text('new text', null, 'Red');
*/

const {round} = Math;

export function engageTextcursorTip(tctRoot) {
  const root = (tctRoot || document.body);
  root.addEventListener('mouseover', (event) => {
    const target = event.target;
    if (target.hasAttribute('data-tip')) {
      const tipText = target.getAttribute('data-tip');

      // Determine the quadrant of root the mouse is in
      const rect = root.getBoundingClientRect();
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      const T_or_B = (mouseY < rect.height /2) ? 'T' : 'B';
      const L_or_R = (mouseX < rect.width /2) ? 'L' : 'R';
      const quadrant = T_or_B + L_or_R;
      if (!target.textCursor) {
        target.textCursor = new TextCursor(target, tipText, quadrant);
      } else {
        target.textCursor.set_text(tipText);
      }
    }
  });
  root.addEventListener('mouseout', (event) => {
    const target = event.target;
    //console.log(`engageTextCursorTip mouseout`, target, event)
    if (target.textCursor) {
      target.textCursor.set_text(null); // reset to default cursor
      delete target.textCursor;
    }
  });
}

export function CLASSICengageTextcursorTip(tctRoot) {
  const root = (tctRoot || document.body);
  root.addEventListener('mouseover', (event) => {
    const target = event.target;
    if (target.hasAttribute('data-tip')) {
      const tipText = target.getAttribute('data-tip');
      if (!target.textCursor) {
        target.textCursor = new TextCursor(target, tipText, 'TL');
      } else {
        target.textCursor.set_text(tipText);
      }
    }
  });
  root.addEventListener('mouseout', (event) => {
    const target = event.target;
    if (target.textCursor) {
      target.textCursor.set_text(null); // reset to default cursor
      delete target.textCursor;
    }
  });
}

export class TextCursor {
  static initClass() {
    this.prototype.fontFillStyle = "black";
    this.prototype.bgFillStyle = "Yellow";
    this.prototype.bgGlobalAlpha = 0.6;
    this.prototype.borderStrokeStyle = "black";
    this.prototype.face = "sans-serif";
    this.prototype.width = 128;
    this.prototype.height = 31;
    this.prototype.scale = .285; // avoid clipping bottom outline when two-lines
    this.prototype.pointer_height = 5;
  }
  static text2max_width = {};
  constructor(elem, text, quadrant) {
    // Accept selector string or DOM element
    this.elem = typeof elem === 'string' ? document.querySelector(elem) : elem;
    if (!this.elem) {
      console.warn(`TextCursor: element not found`, elem);
    }
    this.cache = {};
    this.quadrant = quadrant || 'TL';  // default quadrant
    this.paused = false;
    this.last_text = "";
    if (text) {
      this.set_text(text);
    }
  }
  font_height() {
    return this.height * this.scale;
  }
  get hotspot() {
    let x, y;
    let scale = this.scale;
    scale = 1;
    y = (this.quadrant.includes('T'))
      ? 0            // Top
      : this.height; // Bottom
    x = (this.quadrant.includes('L'))
      ? 0            // Left
      : this.width;  // Right
    return { x: round(x/scale) + this.pointer_height, y: round(y/scale) };
  }
  get hotness() {
    const {hotspot} = this;
    return `${hotspot.x} ${hotspot.y}`;
  }
  getHotness(dims) {
    let x = dims.width,
        y = dims.height;
    let scale = this.scale;
    scale = 1;
    y = (this.quadrant.includes('T'))
      ? 0            // Top
      : this.height; // Bottom
    x = (this.quadrant.includes('L'))
      ? 0            // Left
      : this.width;  // Right
    return `${round(x/scale)} ${round(y/scale)}`;
  }
  set_text(text, temp, bgcolor) {
    let cursor;
    const {quadrant, hotness} = this;
    this.bgFillStyle = bgcolor ? bgcolor : "salmon";
    if (text) {
      if ((this.cache[text] == null)) {
        this.cache[text] = this.make_img(text);
      }
      const url = this.cache[text];
      //console.log({quadrant, hotness});
      cursor = `url(${url}) ${hotness}, default`;
    } else {
      cursor = "default";
    }
    if ((temp == null)) {
      this.last_text = text;
    }
    if (!this.paused) {
      this.set_cursor(cursor);
    }
  }
  pause(cursor, text) {
    this.paused = false; // so @set_cursor will run if set_text called
    if (text != null) {
      this.set_text(text, true);
    } else {
      this.set_cursor(cursor);
    }
    this.paused = true;
  }
  continue() {
    this.paused = false;
    this.set_text(this.last_text);
  }
  set_cursor(cursor) {
    if (this.elem) {
      this.elem.style.cursor = cursor;
    }
  }
  get_max_width(lines) {
    const ctx = this.prep_ctx(this.width, this.height);
    let max_width = 0;
    for (let line of lines) {
      if (line) max_width = Math.max(ctx.measureText(line).width, max_width);
    }
    return max_width;
  }
  prep_canvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  prep_ctx(width, height) {
    const canvas = this.prep_canvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.translate(0, this.font_height());
    ctx.fillStyle = this.fontFillStyle;
    ctx.font = `${this.font_height()}px ${this.face}`;
    ctx.textAlign = 'left';
    return ctx;
  }
  get_lines_and_width(text) { // retrieve or calculate the max_width and lines for text
    const {text2max_width} = this.constructor;
    let max_width = text2max_width[text];
    const lines = text.split("\n");
    if (!max_width) {
      max_width = this.get_max_width(lines);
      text2max_width[text] = max_width;
    }
    return {lines, max_width};
  }
  make_img(text) {
    // TODO make a speech bubble sort of thing of low opacity but text of high
    //    http://stackoverflow.com/a/8001254/1234699
    //    http://www.scriptol.com/html5/canvas/speech-bubble.php
    let i, line, voffset;
    const font_height = this.font_height(),
          id = "temp_TextCursor_canvas",
          sel = `#${id}`,
          inset = 3,
          top = 10,
          radius = font_height / 2;

    const {lines, max_width} = this.get_lines_and_width(text);
    //console.warn(text, {max_width});

    const actual_width = max_width + (inset * 4) + radius;  // do not trust this
    //const canvas = this.canvas = this.prep_canvas(actual_width, this.height);

    const ctx = this.ctx = this.prep_ctx(actual_width, this.height);
    const canvas = this.canvas = ctx.canvas;
    canvas.id = id;
    document.body.append(canvas);

    const height = (font_height * lines.length) + inset;
    const overall_width = max_width + radius*2 + inset;
    const dims = this.draw_bubble(inset, top,
                                  overall_width, height,
                                  this.pointer_height, radius, this.quadrant);

    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line) {
        voffset = (this.font_height() * i) + top;
        this.ctx.fillText(line, top, voffset);
      }
    }
    const url = this.canvas.toDataURL("image/png");
    const {hotness} = this.getHotness(dims);
    const cursor = `url(${url}) ${hotness}, help`;
    this.canvas.remove();
    return url;
  }

  /**
   * Draws a speech bubble with a rounded rectangle and a triangular pointer.
   *
   * @param {number} x - The x-coordinate of the top-left corner of the rectangle.
   * @param {number} y - The y-coordinate of the top-left corner of the rectangle.
   * @param {number} w - The width of the rectangle.
   * @param {number} h - The height of the rectangle.
   * @param {number} pointer_height - The height of the triangular pointer.
   * @param {number} radius - The radius of the corners for the rounded rectangle.
   * @param {string} corner - The location of the pointer. Can be 'TL' (Top Left), 'TR' (Top Right), 'BL' (Bottom Left), 'BR' (Bottom Right).
   * @returns {Object} The dimensions of the image drawn, including the pointer.
   */
  draw_bubble(x, y, w, h, pointer_height, radius, corner = 'TL') {
    const ctx = this.ctx;

    const left   = x;
    const right  = x + w;
    const top    = y;
    const bottom = y + h;

    const beakUp   = top - pointer_height;
    const beakDown = bottom + pointer_height;

    // how wide the beak base is along the edge near the rounded corner
    // keep it ≤ radius so it tucks neatly against the corner arc
    const baseFrac = 0.65;                // 0.4–0.7 looks good
    const baseStep = radius * baseFrac;  // horizontal run along the edge

    ctx.save();
    ctx.translate(0, this.font_height() * -1);
    ctx.beginPath();

    // start at top-left edge after corner arc
    ctx.moveTo(left + radius, top);

    // ---- TOP edge (→)
    if (corner === 'TL') {
      // base sits just after the TL arc; tip goes to (left, beakUp)
      ctx.lineTo(left + radius - baseStep, top);
      ctx.lineTo(left, beakUp);
      ctx.lineTo(left + radius, top);
      ctx.lineTo(right - radius, top);
    } else if (corner === 'TR') {
      ctx.lineTo(right - radius, top);
      // step back a bit from the TR arc, spike to (right, beakUp), then back
      ctx.lineTo(right - radius + baseStep, top);
      ctx.lineTo(right, beakUp);
      ctx.lineTo(right - radius, top);
    } else {
      ctx.lineTo(right - radius, top);
    }

    // top-right corner
    ctx.quadraticCurveTo(right, top, right, top + radius);

    // ---- RIGHT edge (↓)
    ctx.lineTo(right, bottom - radius);

    // bottom-right corner
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);

    // ---- BOTTOM edge (←)
    if (corner === 'BR') {
      // approach TR-style but along the bottom: base near BR arc; tip to (right, beakDown)
      ctx.lineTo(right - radius + baseStep, bottom);
      ctx.lineTo(right, beakDown);
      ctx.lineTo(right - radius, bottom);
      ctx.lineTo(left + radius, bottom);
    } else if (corner === 'BL') {
      ctx.lineTo(left + radius, bottom);
      // base near BL arc; tip to (left, beakDown)
      ctx.lineTo(left + radius - baseStep, bottom);
      ctx.lineTo(left, beakDown);
      ctx.lineTo(left + radius, bottom);
    } else {
      ctx.lineTo(left + radius, bottom);
    }

    // bottom-left corner
    ctx.quadraticCurveTo(left, bottom, left, bottom - radius);

    // ---- LEFT edge (↑)
    ctx.lineTo(left, top + radius);

    // top-left corner
    ctx.quadraticCurveTo(left, top, left + radius, top);

    ctx.closePath();

    // fill (with alpha) then stroke
    if (this.bgGlobalAlpha != null) {
      ctx.save();
      ctx.globalAlpha = this.bgGlobalAlpha;
      if (this.bgFillStyle != null) {
        ctx.fillStyle = this.bgFillStyle;
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.borderStrokeStyle;
    ctx.stroke();

    ctx.restore();

    // footprint: height grows if beak on top or bottom; width unchanged
    const heightWithPointer =
      (corner === 'TL' || corner === 'TR' || corner === 'BL' || corner === 'BR')
        ? (h + pointer_height)
        : h;

    return { width: w, height: heightWithPointer };
  }

}

TextCursor.initClass();
