"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

interface GlobeTerrainProps {
  terrainAtlas: THREE.DataTexture;
  geometry: THREE.SphereGeometry;
}

function createTerrainMaterial(terrainAtlas: THREE.DataTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: terrainAtlas },
    },
    vertexShader: `
          varying vec3 vDirection;
          varying vec3 vViewNormal;

          void main() {
            vDirection = normalize(position);
            vViewNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
    fragmentShader: `
          uniform sampler2D uAtlas;
          varying vec3 vDirection;
          varying vec3 vViewNormal;

          vec2 octEncode(vec3 direction) {
            direction /= abs(direction.x) + abs(direction.y) + abs(direction.z);
            vec2 encoded = direction.xy;
            if (direction.z < 0.0) {
              encoded = (1.0 - abs(encoded.yx)) * sign(encoded.xy);
            }
            return encoded * 0.5 + 0.5;
          }

          void main() {
            vec3 atlasColor = texture2D(uAtlas, octEncode(normalize(vDirection))).rgb;
            float diffuse = dot(
              normalize(vViewNormal),
              normalize(vec3(-0.35, 0.72, 0.6))
            );
            float lightBand = diffuse > 0.48 ? 1.0 : diffuse > 0.05 ? 0.95 : 0.9;
            gl_FragColor = vec4(atlasColor * lightBand, 1.0);
          }
        `,
  });
}

export function GlobeTerrain({ terrainAtlas, geometry }: GlobeTerrainProps) {
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const next = createTerrainMaterial(terrainAtlas);
    setMaterial(next);
    return () => {
      next.dispose();
      setMaterial((current) => (current === next ? null : current));
    };
  }, [terrainAtlas]);

  if (!material) return null;

  return (
    <mesh
      geometry={geometry}
      material={material}
      receiveShadow
      dispose={null}
    />
  );
}
