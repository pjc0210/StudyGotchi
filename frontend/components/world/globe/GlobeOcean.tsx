"use client";

import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PIXEL_ATLAS_SIZE, waterFrameState } from "./globe-spec";
import { buildWaterFrameTextures } from "./globe-materials";

const WATER_FLOW_SPEED = 0.11;

interface GlobeOceanProps {
  terrainAtlas: THREE.DataTexture;
  geometry: THREE.SphereGeometry;
  reducedMotion: boolean;
}

export function oceanAnimationState(
  elapsedSeconds: number,
  reducedMotion: boolean,
) {
  const time = reducedMotion ? 0 : Math.max(0, elapsedSeconds);
  return { time, ...waterFrameState(time * 1000) };
}

function createOceanMaterial(
  terrainAtlas: THREE.DataTexture,
  frames: THREE.DataTexture[],
) {
  return new THREE.ShaderMaterial({
        depthWrite: true,
        uniforms: {
          uTime: { value: 0 },
          uFlowSpeed: { value: WATER_FLOW_SPEED },
          uPatternA: { value: frames[0] },
          uPatternB: { value: frames[1] },
          uPatternMix: { value: 0 },
          uTerrainAtlas: { value: terrainAtlas },
          uDeep: { value: new THREE.Color("#2a7f9f") },
          uShallow: { value: new THREE.Color("#48abc4") },
          uFoam: { value: new THREE.Color("#d9fbf4") },
        },
        vertexShader: `
          uniform float uTime;
          uniform float uFlowSpeed;
          varying vec3 vDirection;

          void main() {
            vec3 direction = normalize(position);
            float flowTime = uTime * uFlowSpeed;
            float waveA = sin(
              dot(direction, normalize(vec3(0.72, 0.18, 0.67))) * 18.0 +
              flowTime * 2.0
            );
            float waveB = sin(
              dot(direction, normalize(vec3(-0.35, 0.82, 0.44))) * 27.0 -
              flowTime * 1.35 +
              1.7
            );
            float waveC = sin(
              dot(direction, normalize(vec3(0.18, -0.51, 0.84))) * 35.0 +
              flowTime * 0.8 +
              3.2
            );
            float displacement = waveA * 0.0035 + waveB * 0.002 + waveC * 0.0012;
            vec3 displaced = position + normal * displacement;
            vDirection = direction;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uFlowSpeed;
          uniform sampler2D uPatternA;
          uniform sampler2D uPatternB;
          uniform float uPatternMix;
          uniform sampler2D uTerrainAtlas;
          uniform vec3 uDeep;
          uniform vec3 uShallow;
          uniform vec3 uFoam;
          varying vec3 vDirection;

          vec2 octEncode(vec3 direction) {
            direction /= abs(direction.x) + abs(direction.y) + abs(direction.z);
            vec2 encoded = direction.xy;
            if (direction.z < 0.0) {
              encoded = (1.0 - abs(encoded.yx)) * sign(encoded.xy);
            }
            return encoded * 0.5 + 0.5;
          }

          void main() {
            vec2 atlasUv = octEncode(normalize(vDirection));
            vec2 atlasPixel = vec2(
              1.0 / ${PIXEL_ATLAS_SIZE.toFixed(1)},
              1.0 / ${PIXEL_ATLAS_SIZE.toFixed(1)}
            );
            float neighboringLand = 0.0;
            neighboringLand = max(
              neighboringLand,
              texture2D(uTerrainAtlas, atlasUv + vec2(atlasPixel.x, 0.0)).a
            );
            neighboringLand = max(
              neighboringLand,
              texture2D(uTerrainAtlas, atlasUv - vec2(atlasPixel.x, 0.0)).a
            );
            neighboringLand = max(
              neighboringLand,
              texture2D(uTerrainAtlas, atlasUv + vec2(0.0, atlasPixel.y)).a
            );
            neighboringLand = max(
              neighboringLand,
              texture2D(uTerrainAtlas, atlasUv - vec2(0.0, atlasPixel.y)).a
            );

            float flowTime = uTime * uFlowSpeed;
            vec2 patternUv =
              atlasUv * vec2(5.5, 5.5) +
              vec2(flowTime * 0.025, -flowTime * 0.014);
            float patternA = texture2D(uPatternA, patternUv).r;
            float patternB = texture2D(uPatternB, patternUv).r;
            float pixelCrest = mix(patternA, patternB, uPatternMix);
            vec2 flowUv = atlasUv * vec2(26.0, 22.0);
            float softSwell = 0.5 + 0.5 * sin(
              flowUv.x * 0.13 +
              flowUv.y * 0.09 -
              flowTime * 0.36
            );
            vec3 water = mix(uDeep, uShallow, 0.22 + softSwell * 0.18);
            vec3 finalColor = mix(
              water,
              uFoam,
              max(pixelCrest * 0.2, neighboringLand * 0.76)
            );
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
  });
}

export function GlobeOcean({
  terrainAtlas,
  geometry,
  reducedMotion,
}: GlobeOceanProps) {
  const [frames, setFrames] = useState<THREE.DataTexture[] | null>(null);
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const next = buildWaterFrameTextures();
    setFrames(next);
    return () => {
      for (const frame of next) frame.dispose();
      setFrames((current) => (current === next ? null : current));
    };
  }, []);

  useEffect(() => {
    if (!frames) return;
    const next = createOceanMaterial(terrainAtlas, frames);
    setMaterial(next);
    return () => {
      next.dispose();
      setMaterial((current) => (current === next ? null : current));
    };
  }, [frames, terrainAtlas]);

  useFrame(({ clock }) => {
    if (!frames || !material) return;
    const frame = oceanAnimationState(clock.elapsedTime, reducedMotion);
    material.uniforms.uPatternA.value = frames[frame.current];
    material.uniforms.uPatternB.value = frames[frame.next];
    material.uniforms.uPatternMix.value = frame.mix;
    material.uniforms.uTime.value = frame.time;
  });

  if (!material) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      renderOrder={1}
      dispose={null}
    />
  );
}
