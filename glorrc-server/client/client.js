import * as PIXI from "pixi.js"
import gsap from "gsap"

import Packet from "./Util/Packet.js";
import Keys from "./Util/Keys.js"
import Extras from "./Util/Extras.js";





const app = new PIXI.Application()
await app.init({
    width: 800,
    height: 600,
    backgroundColor: 0x1e1e1e,
    antialias: true,
    resizeTo: window
});
// Enable zIndex sorting
app.stage.sortableChildren = true;


// Add canvas to page
document.body.appendChild(app.canvas);
// Hide loading screen
setTimeout(() => {
    document.getElementById("loading").classList.add("hidden");
}, 100)





//
//
// - [ PIXI Tile Assets ]
//
//

await PIXI.Assets.load([
    "./assets/tiles/grass.svg",                 // 0
    "./assets/tiles/wall_corner_outer.svg",     // 1
    "./assets/tiles/wall_corner_inner.svg",     // 2
    "./assets/tiles/wall_edge.svg",             // 3
    "./assets/tiles/wall_center.svg",           // 4
    "./assets/tiles/wall_solo.svg",             // 5
    "./assets/tiles/wall_solo_corner_inner.svg",// 6
    "./assets/tiles/wall_solo_corner_outer.svg",// 7
    "./assets/tiles/wall_solo_edge.svg"         // 8
]);
const tileTextures = [
    PIXI.Texture.from("./assets/tiles/grass.svg"),                 // 0
    PIXI.Texture.from("./assets/tiles/wall_corner_outer.svg"),     // 1
    PIXI.Texture.from("./assets/tiles/wall_corner_inner.svg"),     // 2
    PIXI.Texture.from("./assets/tiles/wall_edge.svg"),             // 3
    PIXI.Texture.from("./assets/tiles/wall_center.svg"),           // 4
    PIXI.Texture.from("./assets/tiles/wall_solo.svg"),             // 5
    PIXI.Texture.from("./assets/tiles/wall_solo_corner_inner.svg"),// 6
    PIXI.Texture.from("./assets/tiles/wall_solo_corner_outer.svg"),// 7
    PIXI.Texture.from("./assets/tiles/wall_solo_edge.svg")         // 8
];






//
//
// - [ PIXI Grouping Containers ]
//
//

const mainOffsetContainer = new PIXI.Container();
mainOffsetContainer.x = window.innerWidth / 2;
mainOffsetContainer.y = window.innerHeight / 2;

const renderContainers = {
    map: new PIXI.Container(),
    players: new PIXI.Container()
}
Object.keys(renderContainers).forEach((name, index) => {
    const container = renderContainers[name];
    container.zIndex = index + 1; // loop number starting at 1
    mainOffsetContainer.addChild(container);
});
app.stage.addChild(mainOffsetContainer)








// Initialise EntityData

const EntityData = {
    players: new Map(), // store all player sprites
    clientId: null,     // set this to your client's id
}






//
//
// - [ Initialize WebSocket ]
//
//

const ws = new WebSocket(`ws://${window.location.hostname}:9001/ws`);
ws.binaryType = "arraybuffer"

ws.onopen = () => {
    console.log("Connected to server!");
    ws.send(Packet.EMPTY_MSG.encode(100)); // Join request
};

ws.onmessage = async (event) => {
    const buffer = event.data;
    packetEvent(buffer);
};

ws.onclose = () => {
    console.log("Disconnected from server.");
};

ws.onerror = (err) => {
    console.error("WebSocket error:", err);
};




// Packet Event Handler

function packetEvent(buffer) {

    const type = Packet.handlePacket(buffer);


    if (type == null) return;

    switch (type) {
        case 0: {
            const packet = Packet.UINT16.decode(buffer);
            //console.log("Received client id packet: ", packet);

            // Save client id
            EntityData.clientId = packet.data;

            break;
        }

        case 1: {
            const packet = Packet.PLAYERS.decode(buffer);
            //console.log("Received players snapshot packet: ", packet);

            // Render or update all players
            const ids = [];
            packet.data.forEach((p) => {
                if (EntityData.players.has(p.id)) {
                    EntityUtil.updPlayer(p)
                } else {
                    EntityUtil.setPlayer(p);
                }
                ids.push(p.id);
            });
            for (const [id, p] of EntityData.players) {
                if (!ids.includes(id)) {
                    EntityUtil.remPlayer(id)
                }
            }
            break;
        }

        case 2: {
            const packet = Packet.PLAYER.decode(buffer);
            //console.log("Received player spawn packet: ", packet);

            // Render the joined player
            EntityUtil.setPlayer(packet.data);
            break;
        }

        case 3: {
            const packet = Packet.UINT16.decode(buffer);
            //console.log("Received player leave packet: ", packet);

            // Remove left player sprite
            EntityUtil.remPlayer(packet.data)
            break;
        }
        
        case 4: {
            const packet = Packet.PLAYERS.decode(buffer);
            //console.log("Received players delta packet: ", packet);

            // Update all players
            packet.data.forEach((p) => {
                if (EntityData.players.has(p.id)) {
                    EntityUtil.updPlayer(p)
                    if (p.id == EntityData.clientId) {
                        EntityUtil.updateScreenPositions(true);
                    }
                }
            });
            break;
        }

        case 5: {
            const packet = Packet.MAP.decode(buffer);
            console.log("Received server map")

            const mapData = packet.data
            serverMapData = mapData
            MapUtil.setupMap(mapData);

            break;
        }

        default: {
            console.warn("Unknown packet type:", type);
        }
    }
}




//
//
// - [ MapUtil Func Encapsulator ]
//
//

let serverMapData = null;
const MapUtil = {

    setupMap(mapData) {
        const { width, height, tileSize, tiles } = mapData;
        const tileSprites = [];

        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];

            const row = Math.floor(i / width);
            const col = i % width;

            // Calculate pixel position with center pivot
            const x = col * tileSize + tileSize / 2;
            const y = row * tileSize + tileSize / 2;

            const texture = tileTextures[tile.texture];

            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5); // pivot center
            sprite.x = x;
            sprite.y = y;
            sprite.width = tileSize;
            sprite.height = tileSize;

            // Correct rotation
            sprite.rotation = tile.rotation * (Math.PI / 2);

            sprite.solid = tile.solid;

            renderContainers.map.addChild(sprite);
            tileSprites.push(sprite);
        }

        return tileSprites;
    }
}




//
//
// - [ EntityUtil Func Encapsulator ]
//
//


const EntityUtil = {
    clientPos() {
        const pos = {
            x: 0,
            y: 0
        }
        if (!this.clientId) return pos;
        const sprite = EntityData.players.get(this.clientId);
        if (!sprite) return pos;
        const origData = sprite["__orig_data"];
        if (!origData) return pos;
        pos.x = origData.x;
        pos.y = origData.y
        return pos;
    },
    worldToScreen(x, y) {
        //const ref = this.clientPos();
        const newX = x
        const newY = (serverMapData.height * serverMapData.tileSize) - y

        return {
            x: newX,
            y: newY
        }
    },


    // Remove a player
    remPlayer(id) {
        if (EntityData.players.has(id)) {
            const sprite = EntityData.players.get(id);
            renderContainers.players.removeChild(sprite);
            EntityData.players.delete(id);
        }
    },

    // Add / create a player
    setPlayer(player) {
        const graphics = new PIXI.Graphics();
        graphics.circle(0, 0, 22);
        graphics.fill(0xffffff);
        graphics.stroke({ width: 3, color: 0xc2c2c2 });
        graphics.lineWidth = 10;
        graphics.pivot.set(0, 0);

        EntityData.players.set(player.id, graphics);

        this.updPlayer(player, false);

        renderContainers.players.addChild(graphics);


        this.updateScreenPositions()
    },

    // Update a single player sprite
    updPlayer(player, ease = true) {
        const sprite = EntityData.players.get(player.id);

        const screenPos = this.worldToScreen(player.x, player.y)

        if (ease) {
            gsap.to(sprite, {
                x: screenPos.x,
                y: screenPos.y,   // avoid flipping sign unless your coordinate system requires it
                duration: 0.08, // match to server tick rate
                ease: 'linear',
                overwrite: 'auto'
            });
        } else {
            sprite.x = screenPos.x;
            sprite.y = screenPos.y;
        }
        
        //sprite.x = player.x;
        //sprite.y = -player.y;
        //console.log(player)
        

        sprite["__orig_data"] = {
            id: player.id,
            x: player.x,
            y: player.y
        };
    },


    updateScreenPositions(ease = false) {
        const duration = ease ? 0.08 : 0;
        const easing = ease ? 'linear' : 'none';

        // Tween or set main offset container
        if (ease) {
            gsap.to(mainOffsetContainer, {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                duration: duration,
                ease: easing,
                overwrite: 'auto'
            });
        } else {
            mainOffsetContainer.x = window.innerWidth / 2;
            mainOffsetContainer.y = window.innerHeight / 2;
        }

        // Get the player sprite
        const sprite = EntityData.players.get(EntityData.clientId);
        const origData = sprite?.__orig_data;
        if (!origData) return;
        const screenPos = this.worldToScreen(origData.x, origData.y)

        // Tween or set render containers
        // Players container
        if (ease) {
            gsap.to(renderContainers.players, {
                x: -screenPos.x,
                y: -screenPos.y,
                duration: duration,
                ease: easing,
                overwrite: 'auto'
            });
        } else {
            renderContainers.players.x = -screenPos.x;
            renderContainers.players.y = -screenPos.y;
        }

        //// Map container
        if (ease) {
            gsap.to(renderContainers.map, {
                x: -screenPos.x,
                y: -screenPos.y,
                duration: duration,
                ease: easing,
                overwrite: 'auto'
            });
        } else {
            renderContainers.map.x = -screenPos.x;
            renderContainers.map.y = -screenPos.y;
        }
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
    EntityUtil.updateScreenPositions();
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