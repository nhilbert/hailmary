import { ArcRotateCamera, Color4, Engine, HemisphericLight, Scene, Vector3 } from '@babylonjs/core';

export const bootstrapBabylonScene = (canvas: HTMLCanvasElement) => {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);

  scene.clearColor = new Color4(0.02, 0.03, 0.08, 1);

  const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 3, 6, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  new HemisphericLight('light', new Vector3(0, 1, 0), scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    scene.dispose();
    engine.dispose();
  };
};
