import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Environment, ContactShadows, RoundedBox } from '@react-three/drei';

function KnowledgeGlobe() {
  const globeRef = useRef();
  const ringRef = useRef();

  useFrame((state, delta) => {
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.22;
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.16;
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.18 + 0.65;
    }
  });

  return (
    <group position={[0, 0.35, 0]}>
      <mesh ref={globeRef} castShadow>
        <icosahedronGeometry args={[1.02, 2]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.35} metalness={0.15} flatShading />
      </mesh>

      <mesh rotation={[0.2, 0, 0.15]}>
        <icosahedronGeometry args={[1.1, 2]} />
        <meshBasicMaterial color="#93c5fd" wireframe transparent opacity={0.45} />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.62, 0.032, 16, 64]} />
        <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.6} />
      </mesh>

      <Float speed={2.2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh position={[1.42, 0.82, 0.35]} castShadow>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#0f766e" roughness={0.25} metalness={0.3} />
        </mesh>
      </Float>
    </group>
  );
}

function StackedBooksPedestal() {
  const books = useMemo(
    () => [
      { y: -1.15, w: 2.3, d: 1.6, h: 0.24, color: '#0f172a', rot: 0.08 },
      { y: -0.9, w: 2.0, d: 1.45, h: 0.22, color: '#1e3a8a', rot: -0.12 },
      { y: -0.68, w: 1.75, d: 1.3, h: 0.2, color: '#b45309', rot: 0.04 },
    ],
    []
  );

  return (
    <group>
      {books.map((b, idx) => (
        <group key={idx} position={[0, b.y, 0]} rotation={[0, b.rot, 0]}>
          <RoundedBox args={[b.w, b.h, b.d]} radius={0.03} smoothness={2} castShadow receiveShadow>
            <meshStandardMaterial color={b.color} roughness={0.55} />
          </RoundedBox>
          <mesh position={[0.04, 0, 0]}>
            <boxGeometry args={[b.w - 0.12, b.h - 0.05, b.d - 0.1]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function AcademicCampusScene({ className = 'h-[360px] w-full' }) {
  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-100 to-blue-50/70 ${className}`}>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.55, 5.1], fov: 42 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 8, 5]} intensity={1.15} castShadow />
        <Float speed={1.3} rotationIntensity={0.12} floatIntensity={0.2}>
          <KnowledgeGlobe />
        </Float>
        <StackedBooksPedestal />
        <ContactShadows position={[0, -1.35, 0]} opacity={0.35} scale={8} blur={2.4} far={4} />
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.55} />
      </Canvas>
    </div>
  );
}
