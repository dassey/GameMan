# GameMan

A small browser game. A pixel-art agent explores a 3D stone valley, collects sparks, punches rock golems and levels up. Runs in a desktop browser and in VR on a Meta Quest through WebXR.

This is just a learning repo.

## Run

```bash
npm run start:http
```

Opens on http://localhost:8080. For the Quest, `npm start` serves the game over HTTPS on port 8443 (creates a self-signed certificate, needs openssl).
