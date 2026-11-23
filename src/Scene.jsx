import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Scene({ reducedMotion = false, light = false }) {
  const host = useRef(null);
  const theme = useRef(light);
  useEffect(() => { theme.current = light; }, [light]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !matchMedia('(max-width: 700px)').matches, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, .1, 100);
    camera.position.set(0, 0, 8);
    const group = new THREE.Group(); scene.add(group);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xc7ff6b, wireframe: true, transparent: true, opacity: .72 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x303a20, metalness: .65, roughness: .3, emissive: 0x202b0e });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 2), coreMat);
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.48, 2), wireMat);
    group.add(orb, wire);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, .009, 8, 160), new THREE.MeshBasicMaterial({ color: 0xc7ff6b, transparent: true, opacity: .5 }));
    ring.rotation.set(.8, .35, -.3); group.add(ring);
    const count = matchMedia('(max-width: 700px)').matches ? 300 : 650;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { const radius = 2.35 + Math.random() * 2; const a = Math.random() * Math.PI * 2; const y = (Math.random() - .5) * 4.5; positions[i * 3] = Math.cos(a) * radius; positions[i * 3 + 1] = y; positions[i * 3 + 2] = Math.sin(a) * radius - 2; }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xc7ff6b, size: .018, transparent: true, opacity: .62 })); scene.add(points);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const light3d = new THREE.PointLight(0xc7ff6b, 28, 12); light3d.position.set(2, 2, 4); scene.add(light3d);
    let x = 0, y = 0, tx = 0, ty = 0, frame;
    const onMove = e => { const r = el.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * .3; ty = ((e.clientY - r.top) / r.height - .3) * .2; };
    el.addEventListener('pointermove', onMove);
    const animate = () => { frame = requestAnimationFrame(animate); if (!reducedMotion) { x += (tx - x) * .025; y += (ty - y) * .025; group.rotation.y += .0025; group.rotation.x += .0015; points.rotation.y -= .00025; ring.rotation.z += .0007; } group.rotation.y += x * .001; group.position.y = y; wireMat.color.set(theme.current ? 0x819b4d : 0xc7ff6b); renderer.render(scene, camera); };
    animate();
    const resize = () => { if (!el.clientWidth || !el.clientHeight) return; camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    const observer = new ResizeObserver(resize); observer.observe(el);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); el.removeEventListener('pointermove', onMove); geometry.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, [reducedMotion]);
  return <div className="scene" ref={host} aria-label="Sphère 3D interactive composée de particules" role="img" />;
}
