import * as THREE from "three";

export type BlindBallotModel = THREE.Group & {
  userData: {
    ballot: THREE.Group;
    floatingStars: THREE.Group;
    lid: THREE.Group;
  };
};

const COLORS = {
  navy: 0x17234d,
  navyLight: 0x2e427e,
  red: 0xd92f48,
  white: 0xfffdf8,
  gold: 0xffc546,
  ink: 0x10172f,
};

function roundedRectGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: Math.min(radius * 0.42, 0.09),
    bevelThickness: 0.06,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function starGeometry(outer = 0.2, inner = outer * 0.45) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outer : inner;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
}

function material(color: number, roughness = 0.58, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeStar(color: number, size = 0.2) {
  const star = new THREE.Mesh(starGeometry(size), material(color, 0.5));
  star.castShadow = true;
  return star;
}

function makeCheckmark(color: number) {
  const points = [
    new THREE.Vector3(-0.25, 0, 0),
    new THREE.Vector3(-0.05, -0.18, 0),
    new THREE.Vector3(0.34, 0.28, 0),
  ];
  return new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      20,
      0.052,
      8,
      false,
    ),
    material(color, 0.5),
  );
}

/**
 * Procedural img2threejs-style reconstruction of the BlindBallot box.
 * Every visible part remains named and independently animatable.
 */
export function createBlindBallotModel(): BlindBallotModel {
  const root = new THREE.Group() as BlindBallotModel;
  root.name = "BlindBallot";

  const body = new THREE.Group();
  body.name = "ballot-box-body";
  root.add(body);

  const shell = new THREE.Mesh(
    roundedRectGeometry(2.45, 1.72, 1.72, 0.22),
    material(COLORS.white, 0.72),
  );
  shell.name = "ivory-shell";
  shell.position.y = 0.05;
  shell.castShadow = true;
  shell.receiveShadow = true;
  body.add(shell);

  [-0.86, 0, 0.86].forEach((x, index) => {
    const stripe = new THREE.Mesh(
      roundedRectGeometry(index === 1 ? 0.5 : 0.46, 1.55, 0.045, 0.07),
      material(COLORS.red, 0.62),
    );
    stripe.name = `red-stripe-${index + 1}`;
    stripe.position.set(x, 0.02, 0.9);
    stripe.castShadow = true;
    body.add(stripe);
  });

  const privacySeal = new THREE.Group();
  privacySeal.name = "privacy-seal";
  privacySeal.position.set(0, 0.1, 0.98);
  const sealDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.31, 0.085, 32),
    material(COLORS.navy, 0.46),
  );
  sealDisc.rotation.x = Math.PI / 2;
  const lockBody = new THREE.Mesh(
    roundedRectGeometry(0.22, 0.18, 0.055, 0.04),
    material(COLORS.gold, 0.45, 0.08),
  );
  lockBody.position.set(0, -0.055, 0.08);
  const lockLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.035, 8, 20, Math.PI),
    material(COLORS.gold, 0.45, 0.08),
  );
  lockLoop.position.set(0, 0.08, 0.08);
  lockLoop.rotation.z = Math.PI;
  privacySeal.add(sealDisc, lockBody, lockLoop);
  body.add(privacySeal);

  const lid = new THREE.Group();
  lid.name = "navy-lid";
  lid.position.y = 1.02;
  const lidMesh = new THREE.Mesh(
    roundedRectGeometry(2.9, 0.43, 2.02, 0.16),
    material(COLORS.navyLight, 0.48),
  );
  lidMesh.castShadow = true;
  lidMesh.receiveShadow = true;
  lid.add(lidMesh);
  const lidBand = new THREE.Mesh(
    roundedRectGeometry(2.9, 0.17, 2.04, 0.08),
    material(COLORS.navy, 0.5),
  );
  lidBand.position.y = -0.2;
  lid.add(lidBand);
  const slot = new THREE.Mesh(
    roundedRectGeometry(1.15, 0.08, 0.22, 0.04),
    material(COLORS.ink, 0.7),
  );
  slot.rotation.x = -Math.PI / 2;
  slot.position.set(0, 0.28, 0);
  lid.add(slot);
  [-0.82, 0, 0.82].forEach((x, index) => {
    const star = makeStar(COLORS.white, index === 1 ? 0.19 : 0.16);
    star.name = `lid-star-${index + 1}`;
    star.position.set(x, -0.02, 1.04);
    lid.add(star);
  });
  root.add(lid);

  const ballot = new THREE.Group();
  ballot.name = "checked-ballot";
  ballot.position.set(0.15, 2.05, 0.06);
  ballot.rotation.z = -0.11;
  const paper = new THREE.Mesh(
    roundedRectGeometry(0.93, 1.27, 0.12, 0.08),
    material(COLORS.white, 0.78),
  );
  paper.castShadow = true;
  ballot.add(paper);
  const checkBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.27, 0.27, 0.025)),
    new THREE.LineBasicMaterial({ color: COLORS.navy }),
  );
  checkBox.position.set(-0.18, 0.28, 0.085);
  ballot.add(checkBox);
  const check = makeCheckmark(COLORS.red);
  check.name = "red-checkmark";
  check.scale.setScalar(0.72);
  check.position.set(-0.15, 0.34, 0.12);
  ballot.add(check);
  [0.08, -0.15, -0.38].forEach((y, index) => {
    const line = new THREE.Mesh(
      roundedRectGeometry(index === 2 ? 0.42 : 0.5, 0.045, 0.025, 0.02),
      material(index === 2 ? COLORS.navyLight : 0xaeb8d1, 0.75),
    );
    line.position.set(index === 2 ? 0 : 0.1, y, 0.085);
    ballot.add(line);
  });
  root.add(ballot);

  const floatingStars = new THREE.Group();
  floatingStars.name = "floating-stars";
  const leftStar = makeStar(COLORS.navyLight, 0.22);
  leftStar.position.set(-1.82, 0.3, 0.18);
  leftStar.rotation.set(0.15, -0.25, -0.25);
  const rightStar = makeStar(COLORS.red, 0.22);
  rightStar.position.set(1.75, 0.17, 0.2);
  rightStar.rotation.set(-0.12, 0.2, 0.18);
  floatingStars.add(leftStar, rightStar);
  root.add(floatingStars);

  root.userData = { ballot, floatingStars, lid };
  root.rotation.set(-0.04, -0.4, 0);
  root.scale.setScalar(1.05);
  return root;
}
