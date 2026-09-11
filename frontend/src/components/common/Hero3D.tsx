import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, ShieldCheck, Box, RotateCw, Layers, Eye, Sparkles, CheckCircle2, Cpu, Info } from 'lucide-react';

interface StructureProps {
  activeMode: 'all' | 'structure' | 'piping' | 'rebar';
  onSelectNode: (nodeName: string, details: string) => void;
}

function IndustrialStructure({ activeMode, onSelectNode }: StructureProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.15 + 0.3;
    }
  });

  const isDimmed = (mode: string) => activeMode !== 'all' && activeMode !== mode;

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Base Slab */}
      <mesh position={[0, -0.2, 0]}>
        <boxGeometry args={[6, 0.4, 6]} />
        <meshStandardMaterial
          color="#1E293B"
          metalness={0.8}
          roughness={0.3}
          opacity={isDimmed('structure') ? 0.3 : 1}
          transparent
        />
      </mesh>

      {/* Grid Floor Lines */}
      <gridHelper args={[8, 16, '#3B82F6', '#334155']} position={[0, 0.01, 0]} />

      {/* Steel Columns (4 main pillars) */}
      {[
        [-2, 1.5, -2],
        [2, 1.5, -2],
        [-2, 1.5, 2],
        [2, 1.5, 2],
      ].map((pos, idx) => (
        <mesh
          key={`col-${idx}`}
          position={pos as [number, number, number]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode(`Steel Column C-${idx + 1}`, 'Primary structural support • 100% verified aligned against Primavera L5-CIVIL.');
          }}
        >
          <boxGeometry args={[0.22, 3, 0.22]} />
          <meshStandardMaterial
            color={activeMode === 'structure' ? '#60A5FA' : '#2563EB'}
            emissive={activeMode === 'structure' ? '#2563EB' : '#000000'}
            emissiveIntensity={0.4}
            metalness={0.8}
            roughness={0.2}
            opacity={isDimmed('structure') ? 0.2 : 1}
            transparent
          />
        </mesh>
      ))}

      {/* Cross Beams */}
      <mesh
        position={[0, 3, -2]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode('Cross Beam B-101', 'Top tie beam • 100% structural clearance verified.');
        }}
      >
        <boxGeometry args={[4.2, 0.18, 0.18]} />
        <meshStandardMaterial color="#3B82F6" opacity={isDimmed('structure') ? 0.2 : 1} transparent />
      </mesh>
      <mesh position={[0, 3, 2]}>
        <boxGeometry args={[4.2, 0.18, 0.18]} />
        <meshStandardMaterial color="#3B82F6" opacity={isDimmed('structure') ? 0.2 : 1} transparent />
      </mesh>
      <mesh position={[-2, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[4.2, 0.18, 0.18]} />
        <meshStandardMaterial color="#3B82F6" opacity={isDimmed('structure') ? 0.2 : 1} transparent />
      </mesh>
      <mesh position={[2, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[4.2, 0.18, 0.18]} />
        <meshStandardMaterial color="#3B82F6" opacity={isDimmed('structure') ? 0.2 : 1} transparent />
      </mesh>

      {/* Industrial Piping Network */}
      <mesh
        position={[0, 1.2, -1]}
        rotation={[0, 0, Math.PI / 2]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode('Piping Spool Line 24-XX', 'Extracted from field image • Verified 94% confidence against Primavera L6 schedule.');
        }}
      >
        <cylinderGeometry args={[0.16, 0.16, 4.4, 16]} />
        <meshStandardMaterial
          color={activeMode === 'piping' ? '#F59E0B' : '#D97706'}
          emissive={activeMode === 'piping' ? '#F59E0B' : '#000000'}
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
          opacity={isDimmed('piping') ? 0.2 : 1}
          transparent
        />
      </mesh>
      <mesh
        position={[-1.2, 1.8, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode('Cooling Water Header Line 12', 'Secondary piping loop • 88% installation progress.');
        }}
      >
        <cylinderGeometry args={[0.13, 0.13, 4.4, 16]} />
        <meshStandardMaterial
          color={activeMode === 'piping' ? '#34D399' : '#16A34A'}
          emissive={activeMode === 'piping' ? '#10B981' : '#000000'}
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
          opacity={isDimmed('piping') ? 0.2 : 1}
          transparent
        />
      </mesh>

      {/* Crane Tower Silhouette */}
      <group position={[2.5, 2, -2.5]}>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.3, 4, 0.3]} />
          <meshStandardMaterial color="#F59E0B" wireframe opacity={isDimmed('structure') ? 0.2 : 1} transparent />
        </mesh>
        <mesh position={[-1, 3.4, 0]}>
          <boxGeometry args={[3, 0.2, 0.2]} />
          <meshStandardMaterial color="#F59E0B" opacity={isDimmed('structure') ? 0.2 : 1} transparent />
        </mesh>
      </group>

      {/* Floating Interactive Activity Marker Nodes */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh
          position={[-1, 2.2, -1]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode('Pier P3 Reinforcement Node', 'Rebar grid binding verified at 100% completed.');
          }}
        >
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshStandardMaterial
            color="#10B981"
            emissive="#10B981"
            emissiveIntensity={0.8}
            opacity={isDimmed('rebar') ? 0.2 : 1}
            transparent
          />
        </mesh>
      </Float>

      <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.8}>
        <mesh
          position={[1, 1.6, 1]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode('Decking Formwork Node', 'Shuttering panels 75% aligned for pour.');
          }}
        >
          <octahedronGeometry args={[0.26]} />
          <MeshWobbleMaterial
            color="#3B82F6"
            factor={0.4}
            speed={2}
            opacity={isDimmed('rebar') ? 0.2 : 1}
            transparent
          />
        </mesh>
      </Float>

      <Float speed={2.4} rotationIntensity={0.4} floatIntensity={1.2}>
        <mesh
          position={[0.5, 2.8, -0.5]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode('Girder Heavy Lifting Node', 'Span 1 lifting verified on schedule.');
          }}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#F59E0B"
            emissiveIntensity={0.7}
            opacity={isDimmed('rebar') ? 0.2 : 1}
            transparent
          />
        </mesh>
      </Float>
    </group>
  );
}

export function Hero3D() {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [activeMode, setActiveMode] = useState<'all' | 'structure' | 'piping' | 'rebar'>('all');
  const [autoRotate, setAutoRotate] = useState(true);

  // Selected telemetry details for interactive click feedback
  const [telemetryTitle, setTelemetryTitle] = useState('Piping Spool Line 24-XX');
  const [telemetryText, setTelemetryText] = useState('Extracted from field site photo • Verified 94% confidence against Primavera L6 schedule.');

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch (e) {
      setHasWebGL(false);
    }
  }, []);

  const handleSelectNode = (title: string, desc: string) => {
    setTelemetryTitle(title);
    setTelemetryText(desc);
  };

  return (
    <div className="relative w-full h-[500px] lg:h-[560px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B192C] via-[#0F2238] to-[#071322] border border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] transition-all font-sans group">
      {/* Background Ambient Glowing Orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,99,235,0.22),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.18),transparent_60%)] pointer-events-none" />

      {/* TOP OVERLAY BAR: Status Badge + Interactive Layer Filters */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Status Pill */}
        <div className="flex items-center space-x-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-blue-500/40 text-xs font-bold text-blue-300 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live 3D Digital Twin — Pune Zone B</span>
        </div>

        {/* Interactive Layer Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 text-[11px] font-bold text-slate-300 shadow-lg">
          <button
            onClick={() => setActiveMode('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeMode === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            All Layers
          </button>
          <button
            onClick={() => {
              setActiveMode('structure');
              handleSelectNode('Structural Steel Frame', '4x Main columns & tie beams • 100% verified.');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeMode === 'structure' ? 'bg-blue-600 text-white shadow-2xs' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            Structure
          </button>
          <button
            onClick={() => {
              setActiveMode('piping');
              handleSelectNode('Piping Header Line 24-XX', 'Spool erection verified against Primavera L6 schedule.');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeMode === 'piping' ? 'bg-amber-600 text-white shadow-2xs' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            Piping
          </button>
          <button
            onClick={() => {
              setActiveMode('rebar');
              handleSelectNode('Pier Rebar Mesh & Formwork', 'Reinforcement binding & shuttering panels.');
            }}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeMode === 'rebar' ? 'bg-emerald-600 text-white shadow-2xs' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            Rebar & Nodes
          </button>
        </div>
      </div>

      {/* BOTTOM LEFT OVERLAY: Live Interactive Telemetry Card */}
      <div className="absolute bottom-4 left-4 z-20 max-w-xs sm:max-w-sm bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 shadow-xl pointer-events-auto transition-all">
        <div className="flex items-center space-x-2 text-[10px] font-extrabold uppercase tracking-wider text-blue-400 mb-1">
          <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span>3D Element Inspector</span>
        </div>
        <h4 className="text-xs font-bold text-white truncate">{telemetryTitle}</h4>
        <p className="text-[11px] text-slate-300 font-medium leading-snug line-clamp-2 mt-0.5">{telemetryText}</p>
      </div>

      {/* BOTTOM RIGHT: Hint */}
      <div className="absolute bottom-4 right-4 z-10 hidden md:flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[11px] text-slate-400 pointer-events-none">
        <Box className="w-3.5 h-3.5 text-blue-400" />
        <span>Click elements or drag canvas to inspect 3D Twin</span>
      </div>

      {/* CANVAS ELEMENT */}
      {hasWebGL ? (
        <Canvas
          camera={{ position: [5, 4, 7], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 15, 8]} intensity={1.5} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={0.6} color="#2563EB" />
          <pointLight position={[5, 2, 5]} intensity={0.9} color="#16A34A" />
          <IndustrialStructure activeMode={activeMode} onSelectNode={handleSelectNode} />
          <OrbitControls
            enableZoom={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 6}
          />
        </Canvas>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300">
          <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-4">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">3D Digital Twin Environment</h4>
          <p className="text-sm text-slate-400 max-w-sm">
            High-precision spatial execution overlay mapped to Primavera L1-L6 WBS.
          </p>
        </div>
      )}
    </div>
  );
}
