"use client";

import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";

interface ComposerBundle {
  composer: EffectComposer;
  pixelPass: RenderPixelatedPass;
  outputPass: OutputPass;
}

export function PixelComposer({ pixelSize }: { pixelSize: number }) {
  const { gl, scene, camera, size, viewport } = useThree();
  const [bundle, setBundle] = useState<ComposerBundle | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const pixelPass = new RenderPixelatedPass(pixelSize, scene, camera, {
      normalEdgeStrength: 0,
      depthEdgeStrength: 0,
    });
    // RenderPixelatedPass currently treats numeric zero as an omitted option.
    pixelPass.normalEdgeStrength = 0;
    pixelPass.depthEdgeStrength = 0;
    const outputPass = new OutputPass();
    composer.addPass(pixelPass);
    composer.addPass(outputPass);
    const next = { composer, pixelPass, outputPass };
    setBundle(next);

    return () => {
      pixelPass.dispose();
      outputPass.dispose();
      composer.dispose();
      setBundle((current) => (current === next ? null : current));
    };
  }, [camera, gl, pixelSize, scene]);

  useEffect(() => {
    if (!bundle) return;
    bundle.composer.setPixelRatio(viewport.dpr);
    bundle.composer.setSize(size.width, size.height);
  }, [bundle, size.height, size.width, viewport.dpr]);

  useFrame((_, delta) => bundle?.composer.render(delta), 1);
  return null;
}
