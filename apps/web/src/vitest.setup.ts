// Silence jsdom's "not implemented" warning for canvas.
// Babylon.js calls getContext in the Engine constructor; returning null causes
// it to throw synchronously, which GalaxyViewport catches and ignores.
HTMLCanvasElement.prototype.getContext = () => null;
