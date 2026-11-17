import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function RotatingPoly({ color = '#1d4ed8', shape = 'dodecahedron' }) {
  const meshRef = useRef();
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.65;
      meshRef.current.rotation.x += delta * 0.25;
    }
  });

  return (
    <mesh ref={meshRef}>
      {shape === 'octahedron' ? (
        <octahedronGeometry args={[1.15, 0]} />
      ) : (
        <dodecahedronGeometry args={[1.1, 0]} />
      )}
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.25} flatShading />
    </mesh>
  );
}

export default function MiniSubjectBadge3D({ color = '#1d4ed8', shape = 'dodecahedron' }) {
  return (
    <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 3.1], fov: 40 }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 3]} intensity={1.1} />
        <RotatingPoly color={color} shape={shape} />
      </Canvas>
    </div>
  );
}
