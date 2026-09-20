/** Container-ship hull: long rectangular midbody, flat transom, triangular bow. +z is forward. */

export interface ContainerShipHullSpec {
  length: number;
  width: number;
  height: number;
  bowLength: number;
}

export interface HullVertex {
  x: number;
  y: number;
  z: number;
}

export interface ContainerShipHull {
  length: number;
  width: number;
  height: number;
  bowLength: number;
  midshipWidth: number;
  transomWidth: number;
  deckLength: number;
  bowTip: HullVertex;
  vertices: HullVertex[];
  positions: number[];
  indices: number[];
}

function vertex(x: number, y: number, z: number): HullVertex {
  return { x, y, z };
}

export function containerShipHull(spec: ContainerShipHullSpec): ContainerShipHull {
  const length = spec.length;
  const width = spec.width;
  const height = spec.height;
  const bowLength = Math.min(spec.bowLength, length * 0.42);
  const halfW = width / 2;
  const halfH = height / 2;
  const sternZ = -length / 2;
  const shoulderZ = length / 2 - bowLength;
  const tipZ = length / 2;
  const keelW = halfW * 0.84;
  const bowDeckY = halfH + height * 0.06;
  const bowKeelY = -halfH + height * 0.12;

  const vertices = [
    vertex(-halfW, halfH, sternZ),
    vertex(halfW, halfH, sternZ),
    vertex(-halfW, halfH, shoulderZ),
    vertex(halfW, halfH, shoulderZ),
    vertex(-halfW, halfH, 0),
    vertex(halfW, halfH, 0),
    vertex(0, bowDeckY, tipZ),
    vertex(-keelW, -halfH, sternZ),
    vertex(keelW, -halfH, sternZ),
    vertex(-keelW, -halfH, shoulderZ),
    vertex(keelW, -halfH, shoulderZ),
    vertex(0, bowKeelY, tipZ - bowLength * 0.08),
  ];

  const positions = vertices.flatMap((v) => [v.x, v.y, v.z]);
  const D = {
    deckSternP: 0,
    deckSternS: 1,
    deckShoulderP: 2,
    deckShoulderS: 3,
    keelSternP: 7,
    keelSternS: 8,
    keelShoulderP: 9,
    keelShoulderS: 10,
    bowDeck: 6,
    bowKeel: 11,
  };
  const indices = [
    D.deckSternP, D.deckShoulderP, D.deckShoulderS,
    D.deckSternP, D.deckShoulderS, D.deckSternS,
    D.keelSternS, D.keelShoulderS, D.keelShoulderP,
    D.keelSternS, D.keelShoulderP, D.keelSternP,
    D.deckSternP, D.deckSternS, D.keelSternS,
    D.deckSternP, D.keelSternS, D.keelSternP,
    D.deckSternP, D.keelSternP, D.keelShoulderP,
    D.deckSternP, D.keelShoulderP, D.deckShoulderP,
    D.deckSternS, D.deckShoulderS, D.keelShoulderS,
    D.deckSternS, D.keelShoulderS, D.keelSternS,
    D.deckShoulderP, D.bowDeck, D.deckShoulderS,
    D.keelShoulderS, D.bowKeel, D.keelShoulderP,
    D.deckShoulderP, D.keelShoulderP, D.bowKeel,
    D.deckShoulderP, D.bowKeel, D.bowDeck,
    D.deckShoulderS, D.bowDeck, D.bowKeel,
    D.deckShoulderS, D.bowKeel, D.keelShoulderS,
  ];

  return {
    length,
    width,
    height,
    bowLength,
    midshipWidth: width,
    transomWidth: width,
    deckLength: length - bowLength,
    bowTip: vertices[6],
    vertices,
    positions,
    indices,
  };
}
