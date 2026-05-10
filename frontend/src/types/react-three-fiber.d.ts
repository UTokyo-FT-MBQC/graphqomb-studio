import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: ThreeElements["ambientLight"];
      axesHelper: ThreeElements["axesHelper"];
      coneGeometry: ThreeElements["coneGeometry"];
      directionalLight: ThreeElements["directionalLight"];
      edgesGeometry: ThreeElements["edgesGeometry"];
      gridHelper: ThreeElements["gridHelper"];
      group: ThreeElements["group"];
      lineBasicMaterial: ThreeElements["lineBasicMaterial"];
      lineSegments: ThreeElements["lineSegments"];
      mesh: ThreeElements["mesh"];
      meshBasicMaterial: ThreeElements["meshBasicMaterial"];
      meshStandardMaterial: ThreeElements["meshStandardMaterial"];
      planeGeometry: ThreeElements["planeGeometry"];
      sphereGeometry: ThreeElements["sphereGeometry"];
    }
  }
}
