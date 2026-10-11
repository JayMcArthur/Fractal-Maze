// lee/draw_map.js
// Canvas renderer for the expanded map (W, H, T, m).
// Spec: lee/plan.md (draw_map section).
//
// Signature (per spec): draw_map(W, H, T, m, canvasOrOptions)
//   W, H : expanded map width/height (int)
//   T    : terminal list; each T[i] = { x, y, dx, dy, label? }
//   m    : subport matrix m[x][y] in [' ', '|', '-', '\u253C', '\u250C', '\u2510', '\u2514', '\u2518', 'T']
//   canvasOrOptions : HTMLCanvasElement OR { canvas, cellSize, padding, P }
//     P (optional): port list [{s, e}, ...] used to compute labels like '1s', '2e'.
//     If neither P nor T[i].label is given, terminals are labelled by index.

(function (global) {
  const CH_CROSS = '\u253C';
  const CH_DR    = '\u250C';
  const CH_DL    = '\u2510';
  const CH_UR    = '\u2514';
  const CH_UL    = '\u2518';

  function compute_labels(T, P) {
    const labels = new Array(T.length).fill('');
    if (P && P.length) {
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        if (p.s != null && T[p.s]) labels[p.s] = (i + 1) + 's';
        if (p.e != null && T[p.e]) labels[p.e] = (i + 1) + 'e';
      }
    }
    for (let i = 0; i < T.length; i++) {
      if (T[i] && typeof T[i].label === 'string' && T[i].label.length) {
        labels[i] = T[i].label;
      } else if (!labels[i]) {
        labels[i] = String(i);
      }
    }
    return labels;
  }

  function resolve_opts(canvasOrOptions) {
    if (!canvasOrOptions) return {};
    if (typeof HTMLCanvasElement !== 'undefined' && canvasOrOptions instanceof HTMLCanvasElement) {
      return { canvas: canvasOrOptions };
    }
    if (canvasOrOptions.getContext) return { canvas: canvasOrOptions };
    return canvasOrOptions;
  }

  function draw_map(W, H, T, m, canvasOrOptions) {
    const opts = resolve_opts(canvasOrOptions);
    const canvas = opts.canvas;
    if (!canvas) throw new Error('draw_map: canvas is required (pass as 5th arg or options.canvas)');

    const cell = opts.cellSize || 30;
    const pad  = (opts.padding != null) ? opts.padding : 10;
    const ctx  = canvas.getContext('2d');

    canvas.width  = W * cell + pad * 2;
    canvas.height = H * cell + pad * 2;

    // Map background: dark gray fill, medium gray border.
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#222222';
    ctx.fillRect(pad, pad, W * cell, H * cell);
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad + 0.5, pad + 0.5, W * cell, H * cell);

    // Grid lines (medium gray on dark bg).
    ctx.strokeStyle = '#444444';
    ctx.beginPath();
    for (let x = 1; x < W; x++) {
      const px = pad + x * cell + 0.5;
      ctx.moveTo(px, pad);
      ctx.lineTo(px, pad + H * cell);
    }
    for (let y = 1; y < H; y++) {
      const py = pad + y * cell + 0.5;
      ctx.moveTo(pad, py);
      ctx.lineTo(pad + W * cell, py);
    }
    ctx.stroke();

    // Subports (light gray lines on dark bg).
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let x = 0; x < W; x++) {
      const col = m[x];
      if (!col) continue;
      for (let y = 0; y < H; y++) {
        const c = col[y];
        if (!c || c === ' ' || c === 'T') continue;
        draw_subport(ctx, pad, cell, x, y, c);
      }
    }

    // Terminals on top.
    const labels = compute_labels(T, opts.P);
    for (let i = 0; i < T.length; i++) {
      draw_terminal(ctx, pad, cell, T[i], labels[i]);
    }
  }

  function cell_center(pad, cell, x, y) {
    return { cx: pad + x * cell + cell / 2, cy: pad + y * cell + cell / 2 };
  }

  function draw_subport(ctx, pad, cell, x, y, c) {
    const { cx, cy } = cell_center(pad, cell, x, y);
    const half = cell / 2;
    ctx.beginPath();
    switch (c) {
      case '|':
        ctx.moveTo(cx, cy - half);
        ctx.lineTo(cx, cy + half);
        break;
      case '-':
        ctx.moveTo(cx - half, cy);
        ctx.lineTo(cx + half, cy);
        break;
      case CH_CROSS:
        ctx.moveTo(cx, cy - half);
        ctx.lineTo(cx, cy + half);
        ctx.moveTo(cx - half, cy);
        ctx.lineTo(cx + half, cy);
        break;
      case CH_DR: // ┌ right + down
        ctx.moveTo(cx + half, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + half);
        break;
      case CH_DL: // ┐ left + down
        ctx.moveTo(cx - half, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + half);
        break;
      case CH_UR: // └ right + up
        ctx.moveTo(cx + half, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy - half);
        break;
      case CH_UL: // ┘ left + up
        ctx.moveTo(cx - half, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy - half);
        break;
    }
    ctx.stroke();
  }

  function draw_terminal(ctx, pad, cell, t, label) {
    if (!t) return;
    const { cx, cy } = cell_center(pad, cell, t.x, t.y);
    const half = cell / 2;
    const inset = Math.max(2, cell * 0.08);

    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(cx - half + inset, cy - half + inset, cell - inset * 2, cell - inset * 2);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - half + inset + 0.5, cy - half + inset + 0.5, cell - inset * 2 - 1, cell - inset * 2 - 1);

    // Red highlight on the cell edge in the (dx, dy) departure direction.
    if (t.dx || t.dy) {
      draw_terminal_edge(ctx, pad, cell, t);
    }

    // Label (port index + s/e, e.g. '1s'). Regular weight, light on dark.
    ctx.fillStyle = '#ffffff';
    ctx.font = Math.max(8, Math.floor(cell * 0.38)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label != null ? String(label) : '', cx, cy);
  }

  function draw_terminal_edge(ctx, pad, cell, t) {
    const x0 = pad + t.x * cell;
    const y0 = pad + t.y * cell;
    ctx.strokeStyle = '#f44444';
    ctx.lineWidth = 3;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    if (t.dx === 1) {
      ctx.moveTo(x0 + cell, y0);
      ctx.lineTo(x0 + cell, y0 + cell);
    } else if (t.dx === -1) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0, y0 + cell);
    } else if (t.dy === 1) {
      ctx.moveTo(x0, y0 + cell);
      ctx.lineTo(x0 + cell, y0 + cell);
    } else if (t.dy === -1) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + cell, y0);
    }
    ctx.stroke();
  }

  global.draw_map = draw_map;
  global.compute_labels = compute_labels;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { draw_map: draw_map, compute_labels: compute_labels };
  }
})(typeof window !== 'undefined' ? window : globalThis);
