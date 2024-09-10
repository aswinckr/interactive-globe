import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./App.css";
import jupiterTexture from "/src/textures/8k_mars.jpg";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Set up scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Enable shadow mapping
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows

    // Load texture
    const textureLoader = new THREE.TextureLoader();
    const marsTexture = textureLoader.load(jupiterTexture);

    // Create textured sphere
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      map: marsTexture,
      shininess: 5, // Reduce shininess for a less reflective surface
      emissive: new THREE.Color(0x222222), // Add a slight emissive color
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true; // The sphere will cast shadows
    sphere.receiveShadow = true; // The sphere will receive shadows
    scene.add(sphere);

    // Add directional light (sunlight)
    const sunlight = new THREE.DirectionalLight(0xffffff, 1.5); // Increase intensity
    sunlight.position.set(5, 3, 5); // Position the light
    sunlight.castShadow = true; // Enable shadow casting
    sunlight.shadow.mapSize.width = 1024; // Increase shadow map resolution
    sunlight.shadow.mapSize.height = 1024;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 20;
    scene.add(sunlight);

    // Add ambient light for overall scene brightness
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8); // Increase intensity
    scene.add(ambientLight);

    // Add a hemisphere light for better color balance
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    scene.add(hemisphereLight);

    // Set up camera position
    camera.position.z = 3;

    // Add OrbitControls for interactivity
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Updated stars creation
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const starsSizes = [];
    const starsBrightness = [];

    for (let i = 0; i < 20000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 100 + Math.random() * 900;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      starsVertices.push(x, y, z);
      starsSizes.push(0.1 + Math.random() * 0.9); // Sizes between 0.1 and 1
      starsBrightness.push(0.2 + Math.random() * 0.8); // Brightness between 0.2 and 1
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    starsGeometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(starsSizes, 1)
    );
    starsGeometry.setAttribute(
      "brightness",
      new THREE.Float32BufferAttribute(starsBrightness, 1)
    );

    const starsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        attribute float brightness;
        varying float vBrightness;
        void main() {
          vBrightness = brightness;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vBrightness;
        void main() {
          if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5) discard;
          gl_FragColor = vec4(color * vBrightness, 1.0);
        }
      `,
    });

    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // Add shooting stars
    const shootingStarsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    const createShootingStar = () => {
      const shootingStarGeometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(6);
      const velocity = new Float32Array(3);

      for (let i = 0; i < 2; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const radius = 100 + Math.random() * 900;

        vertices[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        vertices[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        vertices[i * 3 + 2] = radius * Math.cos(phi);
      }

      velocity[0] = (Math.random() - 0.5) * 0.3;
      velocity[1] = (Math.random() - 0.5) * 0.3;
      velocity[2] = (Math.random() - 0.5) * 0.3;

      shootingStarGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(vertices, 3)
      );
      const shootingStar = new THREE.Points(
        shootingStarGeometry,
        shootingStarsMaterial
      );
      shootingStar.userData.velocity = velocity;
      scene.add(shootingStar);

      return shootingStar;
    };

    const shootingStars = Array(5).fill(null).map(createShootingStar);

    // Updated animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      sphere.rotation.y += 0.001; // Reduced from 0.005 to 0.001
      starField.rotation.y += 0.0002;

      // Animate shooting stars
      shootingStars.forEach((star) => {
        const positions = star.geometry.attributes.position.array;
        const velocity = star.userData.velocity;

        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += velocity[0];
          positions[i + 1] += velocity[1];
          positions[i + 2] += velocity[2];
        }

        star.geometry.attributes.position.needsUpdate = true;

        // Reset shooting star if it's too far from the center
        if (
          Math.abs(positions[0]) > 1000 ||
          Math.abs(positions[1]) > 1000 ||
          Math.abs(positions[2]) > 1000
        ) {
          const newStar = createShootingStar();
          scene.remove(star);
          const index = shootingStars.indexOf(star);
          shootingStars[index] = newStar;
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} />;
}

export default App;
