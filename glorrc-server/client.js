import * as PIXI from "pixi.js"
import gsap from "gsap"

import Packet from "./Packet.js";
import Keys from "./Keys.js"
import Extras from "./Extras.js";

const ws = new WebSocket(`ws://${window.location.hostname}:9001/ws`);
ws.binaryType = "arraybuffer"

ws.onopen = () => {
    console.log("Connected to server!");
    ws.send(Packet.EMPTY_MSG.encode(100)); // Join request
};

ws.onmessage = async (event) => {
    const buffer = event.data;
    packetEvent(buffer);};

ws.onclose = () => {
    console.log("Disconnected from server.");
};

ws.onerror = (err) => {
    console.error("WebSocket error:", err);
};






const app = new PIXI.Application()
await app.init({
    width: 800,
    height: 600,
    backgroundColor: 0x1e1e1e,
    antialias: true,
    resizeTo: window
});

// Add canvas to page
document.body.appendChild(app.canvas);
// Hide loading screen
setTimeout(() => {
    document.getElementById("loading").classList.add("hidden");
}, 100)






function packetEvent(buffer) {

    const type = Packet.handlePacket(buffer);


    if (type == null) return;

    switch (type) {
        case 0: {
            const packet = Packet.UINT16.decode(buffer);
            //console.log("Received client id packet: ", packet);

            // Save client id
            Entities.clientId = packet.data;
            break;
        }

        case 1: {
            const packet = Packet.PLAYERS.decode(buffer);
            //console.log("Received players snapshot packet: ", packet);

            // Render or update all players
            const ids = [];
            packet.data.forEach((p) => {
                if (Entities.players.has(p.id)) {
                    Entities.updPlayer(p)
                } else {
                    Entities.setPlayer(p);
                }
                ids.push(p.id);
            });
            for (const [id, p] of Entities.players) {
                if (!ids.includes(id)) {
                    Entities.remPlayer(id)
                }
            }
            break;
        }

        case 2: {
            const packet = Packet.PLAYER.decode(buffer);
            //console.log("Received player spawn packet: ", packet);

            // Render the joined player
            Entities.setPlayer(packet.data);
            break;
        }

        case 3: {
            const packet = Packet.UINT16.decode(buffer);
            //console.log("Received player leave packet: ", packet);

            // Remove left player sprite
            Entities.remPlayer(packet.data)
            break;
        }
        
        case 4: {
            const packet = Packet.PLAYERS.decode(buffer);
            //console.log("Received players delta packet: ", packet);

            // Update all players
            packet.data.forEach((p) => {
                if (Entities.players.has(p.id)) {
                    Entities.updPlayer(p)
                    if (p.id == Entities.clientId) {
                        Entities.updateScreenPositions();
                    }
                }
            });
            break;
        }

        default: {
            console.warn("Unknown packet type:", type);
        }
    }
}








//
//
// - [ Entity data & func encapsulator ]
//
//


const Entities = {
    players: new Map(), // store all player sprites
    clientId: null,     // set this to your client's id



    clientPos() {
        const pos = {
            x: 0,
            y: 0
        }
        if (!this.clientId) return pos;
        const sprite = this.players.get(this.clientId);
        if (!sprite) return pos;
        const origData = sprite["__orig_data"];
        if (!origData) return pos;
        pos.x = origData.x;
        pos.y = origData.y
        return pos;
    },
    worldToScreen(x, y) {
        const ref = this.clientPos();
        const relativeX = x - ref.x;
        const relativeY = y - ref.y;

        return Extras.worldCenter(relativeX, relativeY);
    },


    // Remove a player
    remPlayer(id) {
        if (this.players.has(id)) {
            const sprite = this.players.get(id);
            app.stage.removeChild(sprite);
            this.players.delete(id);
        }
    },

    // Add / create a player
    setPlayer(player) {
        const graphics = new PIXI.Graphics();
        graphics.circle(0, 0, 15);
        graphics.fill(0xffffff);
        graphics.pivot.set(0, 0);

        this.players.set(player.id, graphics);

        this.updPlayer(player);

        app.stage.addChild(graphics);
    },

    // Update a single player sprite
    updPlayer(player) {
        const sprite = this.players.get(player.id);
        this.updateScreenPosition(sprite, player);

        sprite["__orig_data"] = {
            id: player.id,
            x: player.x,
            y: player.y
        };
    },

    // Update all player sprites
    updateScreenPositions() {
        for (const [id, sprite] of this.players) {
            const origData = sprite["__orig_data"];
            this.updateScreenPosition(sprite, origData);
        }
    },

    // Convert world data to screen position and apply to sprite
    updateScreenPosition(sprite, data) {
        let pos = Extras.worldCenter(0, 0);

        if (data.id != this.clientId) {
            pos = this.worldToScreen(data.x, data.y);
        }

        sprite.x = pos.x;
        sprite.y = pos.y;
    }
};


//
//
// - [ Loops & Tickers ] -
//
//


// Game Loop
const keys = new Keys();

let gameLoopId = 0;
function gameLoop() {

    if (keys.isDown('KeyW')) {
        
    }


    keys.clearFrame();
    gameLoopId = requestAnimationFrame(gameLoop);
}
gameLoopId = requestAnimationFrame(gameLoop);


// Input Loop
let inputLoopId = 0;
function inputLoop() {
    if (ws.readyState != ws.OPEN) return;

    const inputState = {
        w: keys.isDown("KeyW"),
        a: keys.isDown("KeyA"),
        s: keys.isDown("KeyS"),
        d: keys.isDown("KeyD")
    }
    ws.send(Packet.INPUT_STATE.encode(102, inputState));

}
inputLoopId = setInterval(inputLoop, 1000 / 30)







//
//
// - [ Screen Position Updating ] -
//
//

window.addEventListener("resize", () => {
    Entities.updateScreenPositions();
});




//
//
// - [ DOM Loaded ] -
//
//

document.addEventListener("DOMContentLoaded", () => {

    //
    //
    // - [ HTML Menus ] -
    //
    //

    const menuStates = {
        edgeGap: 10,

        topLeft: {},
        bottomLeft: {
            inventory: false
        }
    }

    // Inventory Menu
    document.getElementById("btn-inventory").addEventListener("click", () => {
        const menu = document.getElementById("menu-inventory");
        const height = Extras.pxToNum(window.getComputedStyle(menu).height);

        const states = menuStates.bottomLeft;
        if (states.inventory) {
            states.inventory = false;
            menu.style.top = `200px`;
        } else {
            states.inventory = true;
            menu.style.top = `-${height + menuStates.edgeGap}px`;
        }
    });

});



//
//
// - [ Window Unload ] -
//
//

window.addEventListener("beforeunload", () => {
    // Show loading screen
    document.getElementById("loading").classList.remove("hidden");
});







//
//
// - [ Fixing Stuff ] -
//
//

window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

window.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && (
        e.key === "+" ||
        e.key === "-" ||
        e.key === "="
    )) {
        e.preventDefault();
    }
});