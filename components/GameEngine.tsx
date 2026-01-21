import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameState, Player3D, Obstacle3D, Lane, Decoration3D } from '../types';
import { GAME_CONSTANTS, COLORS } from '../constants';
import { detectGesture, resetGestureState, createPixelTexture, playDamageSound } from '../utils/gameUtils';
import { Heart } from 'lucide-react';

interface GameEngineProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  poseData: any;
}

const GameEngine: React.FC<GameEngineProps> = ({ gameState, setGameState, poseData }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Audio Ref
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // Game Logic Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const lavaMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const lastHitTimeRef = useRef<number>(0);
  const cloudsRef = useRef<THREE.Group | null>(null);
  
  // Character Limbs Refs (for animation)
  const limbsRef = useRef<{
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
  } | null>(null);

  const playerStateRef = useRef<Player3D>({ lane: 1, isJumping: false, jumpStartTime: 0, yPosition: 0 });
  const obstaclesRef = useRef<Obstacle3D[]>([]);
  const obstacleMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  
  // Environment Refs
  const decorationsRef = useRef<Decoration3D[]>([]);
  const decorationMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const envMaterialsRef = useRef<{
    wood: THREE.Material;
    leaves: THREE.Material;
    grass: THREE.Material;
    flowerStem: THREE.Material;
    flowerPetalRed: THREE.Material;
    flowerPetalYellow: THREE.Material;
  } | null>(null);

  const speedRef = useRef<number>(GAME_CONSTANTS.START_SPEED);
  const scoreRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const lastDecorSpawnTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // --- THREE.JS INITIALIZATION ---
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.SKY_MINECRAFT);
    // Minecraft-style fog (lighter near horizon)
    scene.fog = new THREE.Fog(COLORS.SKY_MINECRAFT, 40, 90);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 6, 9); // Higher camera to see lanes better
    camera.lookAt(0, 0, -15);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false }); // False for crisp pixels
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 100, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // 5. Sky Elements (Moon & Floating Lanterns) - Lunar New Year Night Scene
    const skyGroup = new THREE.Group();
    scene.add(skyGroup);

    // Full Moon (圆月)
    const moonGeo = new THREE.BoxGeometry(12, 12, 4);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xFFFACD }); // Light yellow moon
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(35, 55, -90);
    moon.rotation.z = Math.PI / 8;
    skyGroup.add(moon);

    // Moon glow effect
    const moonGlowGeo = new THREE.BoxGeometry(18, 18, 2);
    const moonGlowMat = new THREE.MeshBasicMaterial({ color: 0xFFFACD, transparent: true, opacity: 0.3 });
    const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
    moonGlow.position.set(35, 55, -92);
    skyGroup.add(moonGlow);

    // Floating Lanterns (天灯/孔明灯) - replace clouds with lanterns
    const lanternGroup = new THREE.Group();

    // Create floating lanterns across the sky
    for (let i = 0; i < 80; i++) {
        const lantern = new THREE.Group();

        // Lantern body (red paper)
        const bodyGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
        const bodyMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.3 ? 0xff0000 : 0xFFD700, // 70% red, 30% gold
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        lantern.add(body);

        // Lantern glow (emissive effect)
        const glowGeo = new THREE.BoxGeometry(1.2, 1.6, 1.2);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.6
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        lantern.add(glow);

        // Top cap
        const topGeo = new THREE.BoxGeometry(0.8, 0.3, 0.8);
        const topMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 1.1;
        lantern.add(top);

        // Bottom ring
        const bottomGeo = new THREE.BoxGeometry(1.0, 0.2, 1.0);
        const bottom = new THREE.Mesh(bottomGeo, topMat);
        bottom.position.y = -1.0;
        lantern.add(bottom);

        // Random position in sky
        const scale = 0.8 + Math.random() * 1.5;
        lantern.scale.set(scale, scale, scale);
        lantern.position.set(
            (Math.random() - 0.5) * 200,
            12 + Math.random() * 45,
            10 - Math.random() * 150
        );
        lantern.rotation.y = Math.random() * Math.PI;

        lanternGroup.add(lantern);
    }
    skyGroup.add(lanternGroup);
    cloudsRef.current = lanternGroup; // Use for animation

    // FESTIVE GROUND PLANES (Dark green with Lunar New Year feel)
    const groundMat = new THREE.MeshStandardMaterial({ color: COLORS.GROUND_FESTIVE }); // Dark festive green

    // Left ground
    const leftGroundGeo = new THREE.PlaneGeometry(100, 250);
    const leftGround = new THREE.Mesh(leftGroundGeo, groundMat);
    leftGround.rotation.x = -Math.PI / 2;
    leftGround.position.set(-55, -0.1, -75);
    leftGround.receiveShadow = true;
    scene.add(leftGround);

    // Right ground
    const rightGroundGeo = new THREE.PlaneGeometry(100, 250);
    const rightGround = new THREE.Mesh(rightGroundGeo, groundMat);
    rightGround.rotation.x = -Math.PI / 2;
    rightGround.position.set(55, -0.1, -75);
    rightGround.receiveShadow = true;
    scene.add(rightGround);

    // 6. Materials (Minecraft Style)
    const stoneTex = createPixelTexture('stone');
    const obsidianTex = createPixelTexture('obsidian');
    const lavaTex = createPixelTexture('lava');
    const woodTex = createPixelTexture('wood');
    const leavesTex = createPixelTexture('leaves');
    const grassTex = createPixelTexture('grass');

    envMaterialsRef.current = {
        wood: new THREE.MeshStandardMaterial({ map: woodTex }),
        leaves: new THREE.MeshStandardMaterial({ map: leavesTex }),
        grass: new THREE.MeshStandardMaterial({ map: grassTex }),
        flowerStem: new THREE.MeshStandardMaterial({ color: 0x00aa00 }),
        flowerPetalRed: new THREE.MeshStandardMaterial({ color: 0xff0000 }),
        flowerPetalYellow: new THREE.MeshStandardMaterial({ color: 0xffff00 })
    };
    
    // Store lava material ref to animate it later
    const lavaMat = new THREE.MeshBasicMaterial({ 
        map: lavaTex,
        color: 0xffffff
    });
    lavaMaterialRef.current = lavaMat;

    // --- CREATE 3 DISTINCT LANES ---
    stoneTex.repeat.set(4, 40); // Repeat vertically
    const laneGeo = new THREE.PlaneGeometry(GAME_CONSTANTS.LANE_WIDTH - 0.4, 200);
    const laneMat = new THREE.MeshStandardMaterial({ map: stoneTex });

    // Lane 0 (Left)
    const laneLeft = new THREE.Mesh(laneGeo, laneMat);
    laneLeft.rotation.x = -Math.PI / 2;
    laneLeft.position.set(-GAME_CONSTANTS.LANE_WIDTH, 0, -50);
    laneLeft.receiveShadow = true;
    scene.add(laneLeft);

    // Lane 1 (Middle)
    const laneMid = new THREE.Mesh(laneGeo, laneMat);
    laneMid.rotation.x = -Math.PI / 2;
    laneMid.position.set(0, 0, -50);
    laneMid.receiveShadow = true;
    scene.add(laneMid);

    // Lane 2 (Right)
    const laneRight = new THREE.Mesh(laneGeo, laneMat);
    laneRight.rotation.x = -Math.PI / 2;
    laneRight.position.set(GAME_CONSTANTS.LANE_WIDTH, 0, -50);
    laneRight.receiveShadow = true;
    scene.add(laneRight);

    // --- DIVIDERS (Obsidian) ---
    obsidianTex.repeat.set(1, 40);
    const dividerGeo = new THREE.BoxGeometry(0.4, 0.2, 200);
    const dividerMat = new THREE.MeshStandardMaterial({ map: obsidianTex });
    
    // Divider Left/Mid
    const div1 = new THREE.Mesh(dividerGeo, dividerMat);
    div1.position.set(-GAME_CONSTANTS.LANE_WIDTH / 2, 0.1, -50);
    scene.add(div1);

    // Divider Mid/Right
    const div2 = new THREE.Mesh(dividerGeo, dividerMat);
    div2.position.set(GAME_CONSTANTS.LANE_WIDTH / 2, 0.1, -50);
    scene.add(div2);

    // 7. Player (Minecraft Steve-like rig)
    const { group, limbs } = createCharacterMesh();
    group.position.set(0, 0, 0);
    scene.add(group);
    playerGroupRef.current = group;
    limbsRef.current = limbs;

    // --- GAME LOOP ---
    resetGestureState();
    const now = performance.now();
    lastTimeRef.current = now;
    lastSpawnTimeRef.current = now;
    lastDecorSpawnTimeRef.current = now;
    playerStateRef.current = { lane: 1, isJumping: false, jumpStartTime: 0, yPosition: 0 };
    obstaclesRef.current = [];
    decorationsRef.current = [];
    obstacleMeshesRef.current.clear();
    decorationMeshesRef.current.clear();
    scoreRef.current = 0;
    speedRef.current = GAME_CONSTANTS.START_SPEED;
    lastHitTimeRef.current = 0;

    // Render initial frame
    renderer.render(scene, camera);

    // Start animation loop if game is playing
    if (gameState.isPlaying && !gameState.gameOver) {
      isPlayingRef.current = true;
      lastTimeRef.current = performance.now();

      const animate = (time: number) => {
        if (!isPlayingRef.current) return;

        // Always request next frame to keep loop alive
        animationFrameRef.current = requestAnimationFrame(animate);

        // Skip game logic when paused, but still render
        if (isPausedRef.current) {
          lastTimeRef.current = time;
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          return;
        }

        const delta = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        updateGameLogic(delta, time);
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // Cleanup
    return () => {
        isPlayingRef.current = false;
        cancelAnimationFrame(animationFrameRef.current);
        if (rendererRef.current && containerRef.current) {
            containerRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isPlaying, gameState.gameOver]);

  // --- PAUSE STATE SYNC ---
  useEffect(() => {
    isPausedRef.current = gameState.isPaused;
  }, [gameState.isPaused]);

  // --- WINDOW RESIZE HANDLER ---
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- BACKGROUND MUSIC ---
  useEffect(() => {
    // Initialize audio once
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio('/music.mp3');
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.5;
    }

    const music = bgMusicRef.current;

    if (gameState.isPlaying && !gameState.gameOver && !gameState.isPaused) {
      music.play().catch(() => {
        // Autoplay may be blocked, will play on next user interaction
      });
    } else {
      music.pause();
      if (gameState.gameOver || !gameState.isPlaying) {
        music.currentTime = 0;
      }
    }

    return () => {
      music.pause();
    };
  }, [gameState.isPlaying, gameState.gameOver, gameState.isPaused]);

  // --- INPUT HANDLING ---
  useEffect(() => {
    if (!gameState.isPlaying || gameState.gameOver || gameState.isPaused || !poseData) return;
    
    const now = performance.now();
    const gesture = detectGesture(poseData.poseLandmarks, now);
    
    if (gesture === 'JUMP' && !playerStateRef.current.isJumping) {
        playerStateRef.current.isJumping = true;
        playerStateRef.current.jumpStartTime = now;
    } else if (gesture === 'LEFT') {
        const currentLane = playerStateRef.current.lane;
        if (currentLane > 0) playerStateRef.current.lane = (currentLane - 1) as Lane;
    } else if (gesture === 'RIGHT') {
        const currentLane = playerStateRef.current.lane;
        if (currentLane < 2) playerStateRef.current.lane = (currentLane + 1) as Lane;
    }

  }, [poseData, gameState.isPlaying, gameState.gameOver, gameState.isPaused]);


  // --- HELPERS ---

  const createCharacterMesh = () => {
      const group = new THREE.Group();

      // Monkey King (孙悟空) Materials
      const furMat = new THREE.MeshStandardMaterial({ color: COLORS.MONKEY_FUR }); // Golden fur
      const faceMat = new THREE.MeshStandardMaterial({ color: COLORS.MONKEY_FACE }); // Peach face
      const armorMat = new THREE.MeshStandardMaterial({ color: COLORS.MONKEY_ARMOR, metalness: 0.6, roughness: 0.3 }); // Gold armor
      const crownMat = new THREE.MeshStandardMaterial({ color: COLORS.MONKEY_CROWN, metalness: 0.8, roughness: 0.2 }); // Golden crown
      const pantsMat = new THREE.MeshStandardMaterial({ color: COLORS.MONKEY_PANTS }); // Red pants
      const staffMat = new THREE.MeshStandardMaterial({ color: COLORS.MONKEY_STAFF }); // Brown staff
      const goldBandMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.9, roughness: 0.1 }); // Gold bands on staff

      // Head (Monkey face with golden fur)
      const headGeo = new THREE.BoxGeometry(0.55, 0.5, 0.5);
      const head = new THREE.Mesh(headGeo, furMat);
      head.position.y = 1.8;
      head.castShadow = true;
      group.add(head);

      // Face (front of head - peach colored)
      const faceGeo = new THREE.BoxGeometry(0.4, 0.35, 0.1);
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.set(0, 1.75, 0.25);
      group.add(face);

      // Golden Headband (紧箍咒)
      const headbandGeo = new THREE.BoxGeometry(0.6, 0.12, 0.55);
      const headband = new THREE.Mesh(headbandGeo, crownMat);
      headband.position.y = 2.05;
      headband.castShadow = true;
      group.add(headband);

      // Phoenix Feathers on crown (2 feathers)
      const featherMat = new THREE.MeshStandardMaterial({ color: 0xff4500 }); // Orange-red
      const featherGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
      const feather1 = new THREE.Mesh(featherGeo, featherMat);
      feather1.position.set(-0.15, 2.3, 0);
      feather1.rotation.z = 0.2;
      group.add(feather1);
      const feather2 = new THREE.Mesh(featherGeo, featherMat);
      feather2.position.set(0.15, 2.3, 0);
      feather2.rotation.z = -0.2;
      group.add(feather2);

      // Ears (monkey ears)
      const earGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1);
      const leftEar = new THREE.Mesh(earGeo, furMat);
      leftEar.position.set(-0.32, 1.9, 0);
      group.add(leftEar);
      const rightEar = new THREE.Mesh(earGeo, furMat);
      rightEar.position.set(0.32, 1.9, 0);
      group.add(rightEar);

      // Body (Golden armor)
      const bodyGeo = new THREE.BoxGeometry(0.55, 0.75, 0.3);
      const body = new THREE.Mesh(bodyGeo, armorMat);
      body.position.y = 1.125;
      body.castShadow = true;
      group.add(body);

      // Red sash around waist
      const sashGeo = new THREE.BoxGeometry(0.6, 0.15, 0.35);
      const sash = new THREE.Mesh(sashGeo, pantsMat);
      sash.position.y = 0.8;
      group.add(sash);

      // Arms (golden armor sleeves)
      const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
      const leftArm = new THREE.Mesh(armGeo, armorMat);
      leftArm.position.set(-0.42, 1.125, 0);
      leftArm.castShadow = true;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, armorMat);
      rightArm.position.set(0.42, 1.125, 0);
      rightArm.castShadow = true;
      group.add(rightArm);

      // Legs (red pants)
      const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.15, 0.375, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.15, 0.375, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      // Ruyi Jingu Bang (如意金箍棒) - The Magical Staff
      const staffGeo = new THREE.BoxGeometry(0.12, 2.2, 0.12);
      const staff = new THREE.Mesh(staffGeo, staffMat);
      staff.position.set(0.65, 1.2, 0);
      staff.rotation.z = -0.3; // Angled
      staff.castShadow = true;
      group.add(staff);

      // Gold bands on staff
      const bandGeo = new THREE.BoxGeometry(0.16, 0.1, 0.16);
      const band1 = new THREE.Mesh(bandGeo, goldBandMat);
      band1.position.set(0.45, 2.1, 0);
      band1.rotation.z = -0.3;
      group.add(band1);
      const band2 = new THREE.Mesh(bandGeo, goldBandMat);
      band2.position.set(0.85, 0.3, 0);
      band2.rotation.z = -0.3;
      group.add(band2);

      // Tail (monkey tail!)
      const tailMat = new THREE.MeshStandardMaterial({ color: COLORS.MONKEY_FUR });
      const tailGeo = new THREE.BoxGeometry(0.1, 0.1, 0.8);
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(0, 0.7, -0.5);
      tail.rotation.x = -0.5;
      group.add(tail);

      return {
        group,
        limbs: { leftArm, rightArm, leftLeg, rightLeg }
      };
  };

  const createEnvironmentMesh = (type: 'tree' | 'grass' | 'flower'): THREE.Group => {
    const group = new THREE.Group();

    // Lunar New Year themed decorations
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.5, roughness: 0.3 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const tassellMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });

    if (type === 'tree') {
        // Lantern Pole (灯笼柱) - tall pole with hanging lanterns
        const poleHeight = 5 + Math.floor(Math.random() * 3);

        // Wooden pole
        for (let y = 0; y < poleHeight; y++) {
            const poleGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
            const pole = new THREE.Mesh(poleGeo, darkWoodMat);
            pole.position.y = y + 0.5;
            pole.castShadow = true;
            group.add(pole);
        }

        // Horizontal beam at top
        const beamGeo = new THREE.BoxGeometry(2.5, 0.3, 0.3);
        const beam = new THREE.Mesh(beamGeo, darkWoodMat);
        beam.position.y = poleHeight;
        group.add(beam);

        // Hanging lanterns (1-2 on each side)
        const lanternPositions = [-0.9, 0.9];
        lanternPositions.forEach(xPos => {
            // Lantern body
            const lanternGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
            const lantern = new THREE.Mesh(lanternGeo, redMat);
            lantern.position.set(xPos, poleHeight - 1.0, 0);
            group.add(lantern);

            // Gold top rim
            const topRimGeo = new THREE.BoxGeometry(0.9, 0.15, 0.9);
            const topRim = new THREE.Mesh(topRimGeo, goldMat);
            topRim.position.set(xPos, poleHeight - 0.35, 0);
            group.add(topRim);

            // Gold bottom rim
            const bottomRimGeo = new THREE.BoxGeometry(0.9, 0.15, 0.9);
            const bottomRim = new THREE.Mesh(bottomRimGeo, goldMat);
            bottomRim.position.set(xPos, poleHeight - 1.65, 0);
            group.add(bottomRim);

            // Tassel hanging below
            const tasselGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
            const tassel = new THREE.Mesh(tasselGeo, tassellMat);
            tassel.position.set(xPos, poleHeight - 2.1, 0);
            group.add(tassel);

            // String connecting to beam
            const stringGeo = new THREE.BoxGeometry(0.05, 0.4, 0.05);
            const stringMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
            const string = new THREE.Mesh(stringGeo, stringMat);
            string.position.set(xPos, poleHeight - 0.15, 0);
            group.add(string);
        });

    } else if (type === 'grass') {
        // Bamboo cluster (竹子)
        const clusterSize = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < clusterSize; i++) {
            const bambooHeight = 3 + Math.random() * 4;
            const xOff = (Math.random() - 0.5) * 1.5;
            const zOff = (Math.random() - 0.5) * 1.5;

            // Bamboo segments
            for (let y = 0; y < bambooHeight; y += 0.8) {
                const segGeo = new THREE.BoxGeometry(0.25, 0.7, 0.25);
                const seg = new THREE.Mesh(segGeo, bambooMat);
                seg.position.set(xOff, y + 0.35, zOff);
                group.add(seg);

                // Segment joint (darker ring)
                if (y > 0) {
                    const jointGeo = new THREE.BoxGeometry(0.3, 0.1, 0.3);
                    const jointMat = new THREE.MeshStandardMaterial({ color: 0x1a5f1a });
                    const joint = new THREE.Mesh(jointGeo, jointMat);
                    joint.position.set(xOff, y, zOff);
                    group.add(joint);
                }
            }

            // Bamboo leaves at top
            const leafGeo = new THREE.BoxGeometry(0.6, 0.15, 0.1);
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x32CD32 });
            for (let l = 0; l < 3; l++) {
                const leaf = new THREE.Mesh(leafGeo, leafMat);
                leaf.position.set(xOff + (Math.random() - 0.5) * 0.4, bambooHeight + 0.2, zOff);
                leaf.rotation.z = (Math.random() - 0.5) * 0.8;
                leaf.rotation.y = Math.random() * Math.PI;
                group.add(leaf);
            }
        }

    } else if (type === 'flower') {
        // Firework burst (烟花) - static decorative firework
        const burstCenter = new THREE.Vector3(0, 2, 0);
        const colors = [0xff0000, 0xFFD700, 0xff69b4, 0x00ff00, 0xffaa00];
        const sparkColor = colors[Math.floor(Math.random() * colors.length)];
        const sparkMat = new THREE.MeshBasicMaterial({ color: sparkColor });

        // Central burst
        const centerGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const center = new THREE.Mesh(centerGeo, sparkMat);
        center.position.copy(burstCenter);
        group.add(center);

        // Radiating sparks
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 0.8 + Math.random() * 0.5;
            const sparkGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const spark = new THREE.Mesh(sparkGeo, sparkMat);
            spark.position.set(
                burstCenter.x + Math.cos(angle) * radius,
                burstCenter.y + Math.sin(angle) * radius * 0.7,
                burstCenter.z + (Math.random() - 0.5) * 0.5
            );
            group.add(spark);
        }

        // Trailing particles
        for (let i = 0; i < 8; i++) {
            const trailGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const trail = new THREE.Mesh(trailGeo, sparkMat);
            trail.position.set(
                burstCenter.x + (Math.random() - 0.5) * 2,
                burstCenter.y - 0.5 - Math.random() * 1.5,
                burstCenter.z + (Math.random() - 0.5) * 0.5
            );
            group.add(trail);
        }
    }

    return group;
  }

  const spawnDecoration = (z: number) => {
    if (!sceneRef.current) return;

    // Spawn on Left (-X) or Right (+X) - forest on both sides
    const isLeft = Math.random() > 0.5;
    const baseOffset = 8; // Keep decorations away from running lane
    const randomOffset = Math.random() * 50; // Wide spread
    const x = isLeft ? -(baseOffset + randomOffset) : (baseOffset + randomOffset);

    // Determine Type - balanced mix
    const rand = Math.random();
    let type: 'tree' | 'grass' | 'flower' = 'grass';
    if (rand > 0.75) type = 'tree';        // 25% trees
    else if (rand > 0.4) type = 'flower';  // 35% flowers
    // 40% grass

    const id = Math.random().toString();
    const decoration: Decoration3D = {
        id,
        x,
        z,
        type,
        rotation: Math.random() * Math.PI * 2
    };

    decorationsRef.current.push(decoration);

    const meshGroup = createEnvironmentMesh(type);
    meshGroup.position.set(x, 0, z);
    meshGroup.rotation.y = decoration.rotation;

    // Scale randomization - bigger trees!
    let s = 0.8 + Math.random() * 0.4;
    if (type === 'tree') s = 0.9 + Math.random() * 0.6; // Trees can be bigger
    meshGroup.scale.set(s, s, s);

    sceneRef.current.add(meshGroup);
    decorationMeshesRef.current.set(id, meshGroup);
  };

  const spawnObstacle = (z: number) => {
      if (!sceneRef.current || !lavaMaterialRef.current) return;
      
      const lane = Math.floor(Math.random() * 3) as Lane;
      const id = Math.random().toString();
      
      obstaclesRef.current.push({
          id,
          lane,
          z,
          type: 'lava_block',
          passed: false
      });

      // 1x1x1 Minecraft Block
      const geo = new THREE.BoxGeometry(GAME_CONSTANTS.LANE_WIDTH * 0.8, 1.0, 1.0);
      const mesh = new THREE.Mesh(geo, lavaMaterialRef.current);
      
      mesh.position.set(
          (lane - 1) * GAME_CONSTANTS.LANE_WIDTH,
          0.5, // Sitting on floor
          z
      );
      mesh.castShadow = true;
      
      sceneRef.current.add(mesh);
      obstacleMeshesRef.current.set(id, mesh);
  };

  const updateGameLogic = (dt: number, time: number) => {
      const player = playerStateRef.current;
      
      // 1. Difficulty
      speedRef.current = Math.min(
          GAME_CONSTANTS.MAX_SPEED, 
          GAME_CONSTANTS.START_SPEED + (scoreRef.current / 50)
      );

      // 2. Animate Materials & Environment
      if (lavaMaterialRef.current && lavaMaterialRef.current.map) {
          // Flowing Lava
          lavaMaterialRef.current.map.offset.y -= dt * 0.2;
      }

      // Float lanterns upward (Chinese sky lanterns rising)
      if (cloudsRef.current) {
          cloudsRef.current.children.forEach(lantern => {
              lantern.position.y += dt * 0.3; // Slow rise upward
              lantern.position.x += dt * 0.1 * Math.sin(time * 0.001 + lantern.position.z); // Gentle sway
              // Loop lanterns if they go too high
              if (lantern.position.y > 60) {
                  lantern.position.y = 10;
                  lantern.position.x = (Math.random() - 0.5) * 200;
              }
          });
      }

      // 3. Player Movement & Animation
      const targetX = (player.lane - 1) * GAME_CONSTANTS.LANE_WIDTH;
      if (playerGroupRef.current) {
          // Lane Lerp
          playerGroupRef.current.position.x += (targetX - playerGroupRef.current.position.x) * 10 * dt;
          
          // Jump Physics
          if (player.isJumping) {
              const jumpProgress = (time - player.jumpStartTime) / 1000;
              if (jumpProgress < GAME_CONSTANTS.JUMP_DURATION) {
                  const t = jumpProgress / GAME_CONSTANTS.JUMP_DURATION;
                  player.yPosition = GAME_CONSTANTS.JUMP_HEIGHT * 4 * t * (1 - t);
              } else {
                  player.isJumping = false;
                  player.yPosition = 0;
              }
          }
          playerGroupRef.current.position.y = player.yPosition;

          // Limb Animation (Running)
          if (limbsRef.current) {
              const { leftArm, rightArm, leftLeg, rightLeg } = limbsRef.current;
              
              if (player.isJumping) {
                  // Freeze poses or specific jump pose
                  leftArm.rotation.x = -Math.PI; // Arms up!
                  rightArm.rotation.x = -Math.PI;
                  leftLeg.rotation.x = -0.5;
                  rightLeg.rotation.x = 0.5;
              } else {
                  // Run Cycle (Sine wave)
                  const speed = 15;
                  const angle = Math.sin(time * 0.01) * 0.8;
                  
                  leftArm.rotation.x = angle;
                  rightArm.rotation.x = -angle;
                  leftLeg.rotation.x = -angle;
                  rightLeg.rotation.x = angle;
              }
          }

          // Invincibility Blink Logic
          if (time - lastHitTimeRef.current < GAME_CONSTANTS.INVINCIBILITY_DURATION) {
              // Blink every 100ms
              playerGroupRef.current.visible = Math.floor(time / 100) % 2 === 0;
          } else {
              playerGroupRef.current.visible = true;
          }
      }

      // 4. Spawn & Move Environment
      // Spawn decorations at moderate rate
      if (time - lastDecorSpawnTimeRef.current > (GAME_CONSTANTS.SPAWN_INTERVAL_BASE * 1000) / (speedRef.current / 15) / 8) {
        // Spawn 2 decorations at a time
        for (let i = 0; i < 2; i++) {
            spawnDecoration(GAME_CONSTANTS.SPAWN_DISTANCE - Math.random() * 20);
        }
        lastDecorSpawnTimeRef.current = time;
      }
      
      const decorsToRemove: string[] = [];
      decorationsRef.current.forEach(dec => {
          dec.z += speedRef.current * dt;
          const mesh = decorationMeshesRef.current.get(dec.id);
          if (mesh) {
              mesh.position.z = dec.z;
          }
          if (dec.z > 20) { // Past camera
              decorsToRemove.push(dec.id);
          }
      });
      
      decorsToRemove.forEach(id => {
          const mesh = decorationMeshesRef.current.get(id);
          if (mesh && sceneRef.current) {
              sceneRef.current.remove(mesh);
          }
          decorationMeshesRef.current.delete(id);
      });
      decorationsRef.current = decorationsRef.current.filter(d => !decorsToRemove.includes(d.id));


      // 5. Obstacle Logic
      if (time - lastSpawnTimeRef.current > (GAME_CONSTANTS.SPAWN_INTERVAL_BASE * 1000) / (speedRef.current / 15)) {
          spawnObstacle(GAME_CONSTANTS.SPAWN_DISTANCE);
          lastSpawnTimeRef.current = time;
      }

      const obstaclesToRemove: string[] = [];
      
      obstaclesRef.current.forEach(obs => {
          obs.z += speedRef.current * dt;
          
          const mesh = obstacleMeshesRef.current.get(obs.id);
          if (mesh) {
              mesh.position.z = obs.z;
          }

          // Collision (Simple AABB)
          if (obs.z > -1 && obs.z < 1) {
              if (obs.lane === player.lane) {
                  // Must jump over
                  if (player.yPosition < 1.1) {
                      // COLLISION!
                      // Check invincibility
                      const now = performance.now();
                      if (now - lastHitTimeRef.current > GAME_CONSTANTS.INVINCIBILITY_DURATION) {
                          playDamageSound(); // <--- PLAY SOUND HERE
                          lastHitTimeRef.current = now;
                          // Use functional update to check latest lives state
                          setGameState(prev => {
                              const newLives = prev.lives - 1;
                              if (newLives <= 0) {
                                  return { ...prev, lives: 0, gameOver: true, score: scoreRef.current };
                              }
                              return { ...prev, lives: newLives };
                          });
                      }
                  }
              }
          }

          if (obs.z > 5) {
              if (!obs.passed) {
                  scoreRef.current += 10;
                  obs.passed = true;
              }
              obstaclesToRemove.push(obs.id);
          }
      });

      obstaclesToRemove.forEach(id => {
          const mesh = obstacleMeshesRef.current.get(id);
          if (mesh && sceneRef.current) {
              sceneRef.current.remove(mesh);
              // Clean up geometry
              (mesh.geometry as THREE.BufferGeometry).dispose();
          }
          obstacleMeshesRef.current.delete(id);
      });
      obstaclesRef.current = obstaclesRef.current.filter(o => !obstaclesToRemove.includes(o.id));
  };

  return (
    <div className="relative w-full h-full">
        <div ref={containerRef} className="w-full h-full block" />
        
        {/* HUD - Lunar New Year Theme */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center pointer-events-none z-10">
            <div className="flex items-center justify-center gap-3">
                <img src="/new-logo.png" alt="AInfinite" className="w-12 h-12" />
                <h1 className="text-5xl text-[#FFD700] game-font leading-tight drop-shadow-lg" style={{textShadow: '3px 3px 0 #8B0000, -1px -1px 0 #8B0000, 1px -1px 0 #8B0000, -1px 1px 0 #8B0000'}}>
                    AINFINITE MONKEY KING RUN 🏮
                </h1>
            </div>
            <div className="text-[#FFD700] text-lg mt-1" style={{textShadow: '2px 2px 0 #8B0000'}}>
                🐴 Year of the Horse 2026 🐴
            </div>
        </div>

        {/* Lives & Score Panel - Red & Gold Theme */}
        <div className="absolute bottom-8 left-8 hud-panel rounded-lg border-4 border-[#FFD700] bg-[#8B0000]/90 p-4 shadow-xl flex gap-8 items-center">
            <div>
                <div className="text-[#FFD700] text-sm font-bold uppercase mb-1">🧧 Score</div>
                <div className="text-4xl text-white font-black font-mono">
                    {scoreRef.current}
                </div>
            </div>

            <div className="border-l-2 border-[#FFD700]/30 pl-8">
                <div className="text-[#FFD700] text-sm font-bold uppercase mb-1">❤️ Health</div>
                <div className="flex gap-2">
                    {[1, 2, 3].map((life) => (
                        <Heart
                           key={life}
                           fill={life <= gameState.lives ? "#FFD700" : "none"}
                           color={life <= gameState.lives ? "#FFD700" : "#666"}
                           size={32}
                           className="drop-shadow-sm"
                        />
                    ))}
                </div>
            </div>
        </div>

        <div className="absolute bottom-8 right-8 hud-panel rounded-lg border-4 border-[#FFD700] bg-[#8B0000]/90 p-4 shadow-xl text-center">
             <div className="text-white text-xs font-bold">🎆 JUMP DETECTOR</div>
             <div className="text-[#FFD700] text-xs mt-1">Stand & Jump UP!</div>
        </div>

        {playerStateRef.current.isJumping && (
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2">
                 <div className="text-[#FFD700] font-black text-6xl animate-bounce" style={{textShadow: '3px 3px 0 #8B0000, -1px -1px 0 #8B0000, 1px -1px 0 #8B0000, -1px 1px 0 #8B0000'}}>JUMP!</div>
            </div>
        )}
    </div>
  );
};

export default GameEngine;