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


const tileTextureSrcs = [
    "./assets/tiles/grass.svg",
    "./assets/tiles/wall_corner_outer.svg",
    "./assets/tiles/new/dirt_tri_0.svg",
    "./assets/tiles/new/dirt_l_0.svg",
    "./assets/tiles/new/dirt_c_0.svg",
    "./assets/tiles/wall_solo.svg",
    "./assets/tiles/wall_solo_corner_inner.svg",
    "./assets/tiles/wall_solo_corner_outer.svg",
    "./assets/tiles/wall_solo_edge.svg"
];

// build asset list with SVG scaling
const tileAssets = tileTextureSrcs.map(src => ({
    src,
    data: {
        resolution: 2
    }
}));

await PIXI.Assets.load(tileAssets);

const tileTextures = tileTextureSrcs.map(src => PIXI.Assets.get(src));







// Initialise EntityData


const EntityData = {
    players: new Map(), // store all player sprites

    client: {
        id: null,
        inGame: false
    }
}




//
//
// - [ PIXI Grouping Containers ]
//
//




// Main World Container

const worldContainer = new PIXI.Container();
//worldContainer.scale.y = -1
worldContainer.x = window.innerWidth / 2;
worldContainer.y = window.innerHeight / 2;


const renderContainers = {
    map: new PIXI.Container(),
    players: new PIXI.Container()
}
Object.keys(renderContainers).forEach((name, index) => {
    const container = renderContainers[name];
    container.zIndex = index + 1; // loop number starting at 1
    worldContainer.addChild(container);
});







// UI Debug Container

const debugContainer = new PIXI.Container();
const debugText = new PIXI.Text({
    text: "Debug",
    style: {
        fill: 0xffffff,
        stroke: {
            color: 0x000000,
            width: Extras.fslw(50)
        },
        fontSize: 50,
        fontWeight: 900,
        fontFamily: "Ubuntu"
    }
});
debugText.x = 10;
debugText.y = 10;

debugContainer.addChild(debugText);




app.stage.addChild(worldContainer)
app.stage.addChild(debugContainer)









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
            EntityData.client.id = packet.data;

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
                if (id != EntityData.client.id && !ids.includes(id)) {
                    EntityUtil.remPlayer(id)
                }
            }
            break;
        }

        case 2: {
            const packet = Packet.PLAYER.decode(buffer);
            //console.log("Received player enter chunk packet: ", packet);

            // Render the joined player
            EntityUtil.setPlayer(packet.data);
            break;
        }

        case 3: {
            const packet = Packet.UINT16.decode(buffer);
            //console.log("Received player leave chunk: ", packet);

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
                    if (p.id == EntityData.client.id) return;

                    EntityUtil.updPlayer(p)
                }
            });
            break;
        }

        case 6: {
            const packet = Packet.CLIENT_PLAYER.decode(buffer);

            if (packet.data.id == EntityData.client.id) {
                ClientEvents.onWorldJoin(packet.data)
            }

            console.log(`Player with id ${packet.data.id} joined the server`)

            break;
        }

        case 7: {
            const packet = Packet.UINT16.decode(buffer);

            if (packet.data.id == EntityData.client.id) {
                if (EntityData.client.inGame) EntityData.client.inGame = false;
            }

            console.log(`Player with id ${packet.data} left the server`)

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

        case 8: {
            const packet = Packet.CLIENT_PLAYER.decode(buffer);

            ClientEvents.sync(packet.data)
            //console.log(`> Client sync packet`)

            break;
        }


        default: {
            console.warn("Unknown packet type:", type);
        }
    }
}


const ClientEvents = {

    sync(data) {
        EntityUtil.setRawData(data, true);
        EntityUtil.updateScreenPositions(true);
    },

    onWorldJoin(data) {
        if (!EntityData.client.inGame) { EntityData.client.inGame = true; }

        EntityUtil.setPlayer(data);
        EntityUtil.updateScreenPositions();


        setTimeout(() => { this.connecting(false); }, 400)
        
    },


    // HTML
    connecting(state) {
        const screen = document.getElementById('connecting');
        if (state) {
            screen.style.display = 'flex'
        } else {
            screen.style.display = 'none'
        }
    }

}



const MapData = {
    tiles: []
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

            // Pixel position (centered)
            const x = col * tileSize + tileSize / 2;
            const y = row * tileSize + tileSize / 2;

            // -------------------------
            // UNDERLAY TILE (if any)
            // -------------------------
            if (tile.underlay != null) {
                const underTexture = tileTextures[tile.underlay] ?? tileTextures[0];

                const underSprite = new PIXI.Sprite(underTexture);
                underSprite.anchor.set(0.5);

                underSprite.x = x;
                underSprite.y = y;

                // same scaling as main tile
                underSprite.scale.set(tileSize / underTexture.orig.width);

                // optional: usually underlay should NOT rotate
                // (remove this line if you DO want it to rotate)
                // underSprite.rotation = ...

                renderContainers.map.addChild(underSprite);
                tileSprites.push(underSprite);



                MapData.tiles.push(underSprite)
            }

            // -------------------------
            // MAIN TILE
            // -------------------------
            const texture = tileTextures[tile.texture] ?? tileTextures[0];

            const sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5);

            sprite.x = x;
            sprite.y = y;

            sprite.scale.set(tileSize / texture.orig.width);

            sprite.rotation = (((tile.rotation ?? 0) + 3) % 4) * (Math.PI / 2);

            sprite.solid = tile.solid ?? false;

            renderContainers.map.addChild(sprite);
            tileSprites.push(sprite);



            MapData.tiles.push(sprite)
        }

        return tileSprites;
    }
};






//
// - [ EntityUtil Func Encapsulator ]
//

const EntityUtil = {


    // =========================================================
    // WORLD -> SCREEN
    // =========================================================
    spos(x, y) {
        return {
            x,
            y: -y
        };
    },


    // =========================================================
    // REMOVE PLAYER
    // =========================================================
    remPlayer(id) {
        if (!EntityData.players.has(id)) return;

        const sprite = EntityData.players.get(id);
        renderContainers.players.removeChild(sprite);

        EntityData.players.delete(id);
    },


    // =========================================================
    // CREATE PLAYER
    // =========================================================
    setPlayer(player) {
        const graphics = new PIXI.Graphics();
        const screenPos = this.spos(player.x, player.y);

        graphics.circle(0, 0, 22);
        graphics.fill(0xffe763);
        graphics.stroke({ width: 3, color: 0xcfbb50 });
        graphics.lineWidth = 10;
        graphics.pivot.set(0, 0);

        EntityData.players.set(player.id, graphics);

        this.updPlayer(player, false);

        if (player.id === EntityData.client.id) {
            graphics.zIndex = 3;
            worldContainer.addChild(graphics);
            this.updateScreenPositions(false);
        } else {
            renderContainers.players.addChild(graphics);
        }

    },


    // =========================================================
    // UPDATE PLAYER
    // =========================================================
    updPlayer(player, ease = true) {
        if (player.id == EntityData.client.id) return;

        const sprite = EntityData.players.get(player.id);
        if (!sprite) return;
        const screenPos = this.spos(player.x, player.y);

        if (player.id != EntityData.client.id) {
            if (ease) {
                gsap.to(sprite, {
                    x: screenPos.x,
                    y: screenPos.y,
                    duration: 0.08,
                    ease: 'linear',
                    overwrite: 'auto'
                });
            } else {
                sprite.x = screenPos.x;
                sprite.y = screenPos.y;
            }
        }
        //else {
        //    this.setRawData(player);
        //}
        
        this.setRawData(player);
    },


    // =========================================================
    // STORE RAW WORLD DATA
    // =========================================================
    setRawData(player, ease = false) {
        const sprite = EntityData.players.get(player.id);
        if (!sprite) return;
        
        if ("__raw_data" in sprite && ease) {
            gsap.to(sprite.__raw_data, {
                x: player.x,
                y: player.y,
                duration: 0.08,
                ease: 'linear',
                overwrite: 'auto'
            });
            sprite.__raw_data.id = player.id;
        } else {
            sprite.__raw_data = {
                id: player.id,
                x: player.x,
                y: player.y
            }
        }
        
        
    },


    // =========================================================
    // CAMERA CENTER
    // =========================================================
    centerRenderContent(ease = false) {

        const duration = ease ? 0.08 : 0;
        const easing = ease ? 'linear' : 'none';

        if (ease) {
            gsap.to(worldContainer, {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                duration,
                ease: easing,
                overwrite: 'auto'
            });
        } else {
            worldContainer.x = window.innerWidth / 2;
            worldContainer.y = window.innerHeight / 2;
        }
    },


    // =========================================================
    // CAMERA UPDATE (MAIN TRIGGER)
    // =========================================================
    updateScreenPositions(ease = false) {

        const duration = ease ? 0.08 : 0;
        const easing = ease ? 'linear' : 'none';

        const clientSprite = EntityData.players.get(EntityData.client.id);
        if (!clientSprite) return;

        const clientOrig = clientSprite.__raw_data;
        if (!clientOrig) return;

        const clientScreen = this.spos(clientOrig.x, clientOrig.y);

        // players container
        if (ease) {
            gsap.to(renderContainers.players, {
                x: -clientScreen.x,
                y: -clientScreen.y,
                duration,
                ease: easing,
                overwrite: 'auto'
            });

            gsap.to(renderContainers.map, {
                x: -clientScreen.x,
                y: -clientScreen.y - (serverMapData.height * serverMapData.tileSize),
                duration,
                ease: easing,
                overwrite: 'auto'
            });
        } else {
            renderContainers.players.x = -clientScreen.x;
            renderContainers.players.y = -clientScreen.y;

            renderContainers.map.x = -clientScreen.x;
            renderContainers.map.y = -clientScreen.y - (serverMapData.height * serverMapData.tileSize);
        }

    },

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
    EntityUtil.centerRenderContent();
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