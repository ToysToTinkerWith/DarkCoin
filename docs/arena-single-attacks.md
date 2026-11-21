# Arena single attacks

Champion follow-up attacks were removed on September 28, 2026 at the owner’s request.

- Left click performs the equipped weapon’s original attack, or its original unarmed attack when stowed.
- Additional clicks during an action are rejected, not queued. After the cycle ends, clicking again performs the same original attack.
- Damage dice, effects, stamina cost, speed, original multi-hit attacks and hitboxes remain unchanged.
- Server actions cannot chain; client animation controllers reject Swing2.
- Champion, armoury and weapon previews show only the original attack. Second-attack controls, damage cards and double-click instructions are removed.
- Historical follow-up authoring files and reports are inactive and excluded from production imports.

Validation: original bone-pose hashes, all 22 baked first-attack paths, hit windows and timing are preserved; rapid-input rejection, original paired hits, single projectile emission, and preview regressions are covered by tests.

Production release: build `DnnZ42KxnUXyeCwI-Hk3A`, worker `arena-realtime-00031-jat`. Hosting, nextServer and arenaCombat deployed successfully. Live preview smoke tests and WebSocket handshake passed; arena entry reopened.
