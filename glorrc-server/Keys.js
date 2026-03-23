

export default class Keys {
    constructor() {
        this.keysDown = new Set();  // keys currently held down
        this.keysPressed = new Set(); // keys pressed this frame
        this.keysReleased = new Set(); // keys released this frame

        // Listen for keyboard events
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));
    }

    _onKeyDown(event) {
        const key = event.code;

        // Only add to "pressed" if it wasn't already down
        if (!this.keysDown.has(key)) {
            this.keysPressed.add(key);
        }
        this.keysDown.add(key);
    }

    _onKeyUp(event) {
        const key = event.code;

        // Remove from held-down keys, mark as released
        this.keysDown.delete(key);
        this.keysReleased.add(key);
    }

    // Call this at the end of your game loop
    clearFrame() {
        this.keysPressed.clear();
        this.keysReleased.clear();
    }

    // Check if a key is currently held down
    isDown(key) {
        return this.keysDown.has(key);
    }

    // Check if a key was pressed this frame
    wasPressed(key) {
        return this.keysPressed.has(key);
    }

    // Check if a key was released this frame
    wasReleased(key) {
        return this.keysReleased.has(key);
    }
}