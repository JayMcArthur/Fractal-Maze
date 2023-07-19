/*
 - Front: Preview of maze (+ edit, play buttons)
 */

function addClass(o, name) {
    const set = ((o.className || '') + ' ' + name).replace(/^\s*(\S+)\s*$/, '$1').split(/\s+/).filter(c => c).reduce((m, c) => (m[c] = 1, m), {});
    o.className = Object.keys(set).join(' ');
}

function removeClass(o, name) {
    const set = (o.className || '').replace(/^\s*(\S+)\s*$/, '$1').split(/\s+/).filter(c => c).reduce((m, c) => (m[c] = 1, m), {});
    delete set[name];
    o.className = Object.keys(set).join(' ');
}

function htmlCollectionToArray(col) {
    const a = [];
    for(let i=0; i< col.length; i++) {
        a.push(col.item(i));
    }
    return a;
}



class CtxWrapper {
    constructor(ctx, blockSize) {
        this.ctx = ctx;
        this.blockSize = blockSize;
        ['scale', 'save', 'restore', 'setTransform'].forEach(method => {
           this[method] = (...params) => this.ctx[method](...params);
        });
    }

    clearRect(x, y, w, h) {
        return this.ctx.clearRect(x * this.blockSize, y * this.blockSize, w * this.blockSize, h * this.blockSize);
    }

    fillRect(x, y, w, h) {
        return this.ctx.fillRect(x * this.blockSize, y * this.blockSize, w * this.blockSize, h * this.blockSize);
    }

    fillText(text, x, y) {
        return this.ctx.fillText(text, x * this.blockSize, y * this.blockSize);
    }

    translate(x, y) {
        return this.ctx.translate(x * this.blockSize, y * this.blockSize);
    }

    measureText(text) {
        const m = this.ctx.measureText(text);
        return {
            actualBoundingBoxAscent: m.actualBoundingBoxAscent / this.blockSize,
            width: m.width / this.blockSize
        };
    }

    get fillStyle() {
        return this.ctx.fillStyle
    }

    set fillStyle(v) {
        return this.ctx.fillStyle = v
    }

    get font() {
        return this.ctx.font
    }

    set font(v) {
        return this.ctx.font = `${this.blockSize * v}px arial`;
    }

}


const model = new Model();

model.addPage(new EditorPage(model));
model.addPage(new GamePage(model));
model.addPage(new FrontPage(model));

model.start();