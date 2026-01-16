/**
 * Vitest Setup File
 * Provides polyfills for Node.js environment to support pdfjs-dist
 */

// Polyfill DOMMatrix for pdfjs-dist (required in Node.js where DOM APIs are not available)
if (typeof globalThis.DOMMatrix === 'undefined') {
    class DOMMatrixPolyfill {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;

        constructor(init?: string | number[]) {
            if (Array.isArray(init) && init.length === 6) {
                [this.a, this.b, this.c, this.d, this.e, this.f] = init;
            }
        }

        multiply() { return new DOMMatrixPolyfill(); }
        inverse() { return new DOMMatrixPolyfill(); }
        translate() { return new DOMMatrixPolyfill(); }
        scale() { return new DOMMatrixPolyfill(); }
        rotate() { return new DOMMatrixPolyfill(); }
        transformPoint(point: { x: number; y: number }) { return point; }
    }

    // @ts-expect-error - adding polyfill to global
    globalThis.DOMMatrix = DOMMatrixPolyfill;
}

// Polyfill Path2D if not available
if (typeof globalThis.Path2D === 'undefined') {
    class Path2DPolyfill {
        addPath() { }
        closePath() { }
        moveTo() { }
        lineTo() { }
        bezierCurveTo() { }
        quadraticCurveTo() { }
        arc() { }
        arcTo() { }
        ellipse() { }
        rect() { }
    }

    // @ts-expect-error - adding polyfill to global
    globalThis.Path2D = Path2DPolyfill;
}

// Polyfill localStorage (force it for tests)
{
    const storage = new Map<string, string>();
    const localStoragePolyfill = {
        getItem: (key: string) => {
            const val = storage.get(key) ?? null;
            // console.log('[DEBUG LOCALSTORAGE] getItem', key, val ? '(found)' : '(null)');
            return val;
        },
        setItem: (key: string, value: string) => {
            // console.log('[DEBUG LOCALSTORAGE] setItem', key, value.length, 'bytes');
            storage.set(key, value);
        },
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
        key: (index: number) => Array.from(storage.keys())[index] ?? null,
        get length() { return storage.size; }
    };

    // override global
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).localStorage = localStoragePolyfill;
    // node compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = localStoragePolyfill;
}

// Suppress console output during tests for cleaner output (optional)
// Uncomment if you want to silence console logs during tests:
// globalThis.console.log = () => {};
// globalThis.console.debug = () => {};

