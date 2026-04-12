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

const cullBoxGap = 250
const EntityData = {
    players: new Map(), // store all player sprites

    client: {
        id: null,
        cullBox: {
            x: -cullBoxGap - window.innerWidth / 2,
            y: -cullBoxGap - window.innerHeight / 2,
            width: window.innerWidth + cullBoxGap * 2,
            height: window.innerHeight + cullBoxGap * 2
        }
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





// CullBox Debug
//const cullBox = new PIXI.Graphics();
//cullBox.zIndex = 5
//cullBox.rect(EntityData.client.cullBox.x, EntityData.client.cullBox.y, EntityData.client.cullBox.width, EntityData.client.cullBox.height);
//cullBox.stroke({
//    color: 0xffffff,
//    width: 6
//});
//worldContainer.addChild(cullBox)

window.addEventListener('resize', () => {
    EntityData.client.cullBox = {
        x: -cullBoxGap - window.innerWidth / 2,
        y: -cullBoxGap - window.innerHeight / 2,
        width: window.innerWidth + cullBoxGap * 2,
        height: window.innerHeight + cullBoxGap * 2
    }
    //cullBox.clear()
    //cullBox.rect(EntityData.client.cullBox.x, EntityData.client.cullBox.y, EntityData.client.cullBox.width, EntityData.client.cullBox.height);
    //cullBox.stroke({
    //    color: 0xffffff,
    //    width: 6
    //});
})





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
                if (!ids.includes(id)) {
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
                    EntityUtil.updPlayer(p)
                    if (p.id == EntityData.client.id) {
                        EntityUtil.updateScreenPositions(true);
                    }
                }
            });
            break;
        }

        case 6: {
            const packet = Packet.PLAYER_SERVER_STATUS.decode(buffer);

            console.log(`Player with id ${packet.data.id} joined the server`)

            break;
        }

        case 7: {
            const packet = Packet.PLAYER_SERVER_STATUS.decode(buffer);

            console.log(`Player with id ${packet.data.id} left the server`)

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
    // INTERNAL CULL STATE
    // =========================================================
    _cullDirty: false,

    requestCullAll() {
        this._cullDirty = true;
    },

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

        // ensure correct visibility immediately
        this.playerCullCheck(player.id);

        // camera may have changed relevance
        this.requestCullAll();
    },


    // =========================================================
    // UPDATE PLAYER
    // =========================================================
    updPlayer(player, ease = true) {

        const sprite = EntityData.players.get(player.id);
        if (!sprite) return;

        const screenPos = this.spos(player.x, player.y);

        if (player.id !== EntityData.client.id) {

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

            // only THIS player needs checking
            this.playerCullCheck(player.id);

        } else {
            // client moved → camera changed → full cull
            this.requestCullAll();
        }


        //console.log(player.x, player.y)

        this.setOrigData(player);
    },


    // =========================================================
    // STORE RAW WORLD DATA
    // =========================================================
    setOrigData(player) {
        const sprite = EntityData.players.get(player.id);
        if (!sprite) return;

        sprite.__orig_data = {
            id: player.id,
            x: player.x,
            y: player.y
        };
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

        this.requestCullAll();
    },


    // =========================================================
    // CAMERA UPDATE (MAIN TRIGGER)
    // =========================================================
    updateScreenPositions(ease = false) {

        const duration = ease ? 0.08 : 0;
        const easing = ease ? 'linear' : 'none';

        const clientSprite = EntityData.players.get(EntityData.client.id);
        if (!clientSprite) return;

        const clientOrig = clientSprite.__orig_data;
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

        // camera moved → full cull needed
        this.requestCullAll();
        this.runCullAllIfNeeded();
    },


    // =========================================================
    // FULL CULL CACHE
    // =========================================================
    _getCullCache() {

        const client = EntityData.players.get(EntityData.client.id);
        if (!client || !client.__orig_data) return null;

        const c = EntityData.client.cullBox;

        const halfW = c.width * 0.5;
        const halfH = c.height * 0.5;

        const x = client.__orig_data.x;
        const y = -client.__orig_data.y;

        return {
            minX: x - halfW,
            maxX: x + halfW,
            minY: y - halfH,
            maxY: y + halfH
        };
    },


    // =========================================================
    // FULL CULL PASS (OPTIMIZED)
    // =========================================================
    runCullAllIfNeeded() {
        //return // temp disable

        if (!this._cullDirty) return;
        this._cullDirty = false;

        const cached = this._getCullCache();
        if (!cached) return;

        for (const [id, sprite] of EntityData.players) {

            const orig = sprite.__orig_data;
            if (!orig) continue;

            const x = orig.x;
            const y = -orig.y;

            const r = 22;

            sprite.visible =
                (x + r) >= cached.minX &&
                (x - r) <= cached.maxX &&
                (y + r) >= cached.minY &&
                (y - r) <= cached.maxY;
        }

        for (const sprite of MapData.tiles) {
            const x = sprite.x
            const y = sprite.y - (serverMapData.height * serverMapData.tileSize)

            if (sprite.x == 200 && sprite.y == 200) {
                console.log(cached.minX, cached.maxX, cached.minY, cached.maxY)
            }

            const r = serverMapData.tileSize / 2

            sprite.visible =
                (x + r) >= cached.minX &&
                (x - r) <= cached.maxX &&
                (y + r) >= cached.minY &&
                (y - r) <= cached.maxY;
        }
    },


    // =========================================================
    // SINGLE PLAYER CULL CHECK
    // =========================================================
    playerCullCheck(id) {
        //return // temp disable

        const sprite = EntityData.players.get(id);
        if (!sprite) return;

        const orig = sprite.__orig_data;
        if (!orig) return;

        const cached = this._getCullCache();
        if (!cached) return;

        const x = orig.x;
        const y = -orig.y;

        const r = 22;

        sprite.visible =
            (x + r) >= cached.minX &&
            (x - r) <= cached.maxX &&
            (y + r) >= cached.minY &&
            (y - r) <= cached.maxY;
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