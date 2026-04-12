

export default class Packet {


    static handlePacket(buffer) {
        //console.log(buffer)
        try {

            if (!(buffer instanceof ArrayBuffer)) {
                console.error("Received data is not an ArrayBuffer");
                return null;
                ;
            }

            if (buffer.byteLength < 1) {
                console.error("Received empty packet");
                return null;
            }

            const view = new DataView(buffer);
            const packetType = view.getUint8(0);

            // Debug log for packet type
            //console.log("Received packet type:", packetType);

            return packetType;

        } catch (err) {
            console.error("Failed to decode packet:", err);
            return null;
        }
    }



    static EMPTY_MSG = class {

        static encode(type) {
            if (type < 0 || type > 255) {
                throw new RangeError("Message type must be between 0 and 255");
            }

            const buffer = new ArrayBuffer(1);
            const view = new DataView(buffer);
            view.setUint8(0, type);

            return buffer;
        }
    }

    // Decode a single player packet
    static PLAYER = class {
        static decode(buffer) {
            const view = new DataView(buffer);
            let offset = 0;

            const type = view.getUint8(offset);
            offset += 1;

            const id = view.getUint16(offset, true);
            offset += 2;

            const x = view.getFloat32(offset, true);
            offset += 4;

            const y = view.getFloat32(offset, true);
            offset += 4;

            const health = view.getUint8(offset);
            offset += 1;

            return {
                type,
                data: { id, x, y, health }
            };
        }
    }

    // Decode multiple players packet
    static PLAYERS = class {
        static decode(buffer) {
            const view = new DataView(buffer);
            let offset = 0;

            const type = view.getUint8(offset);
            offset += 1;

            const count = view.getUint16(offset, true);
            offset += 2;

            const players = [];

            for (let i = 0; i < count; i++) {
                const id = view.getUint16(offset, true);
                offset += 2;

                const x = view.getFloat32(offset, true);
                offset += 4;

                const y = view.getFloat32(offset, true);
                offset += 4;

                const health = view.getUint8(offset);
                offset += 1;

                players.push({ id, x, y, health });
            }

            return { type, data: players };
        }
    }

    static PLAYER_SERVER_STATUS = class {
        static decode(buffer) {
            const view = new DataView(buffer);
            let offset = 0;

            const type = view.getUint8(offset);
            offset += 1;

            const id = view.getUint16(offset, true); // little endian
            offset += 2;

            return {
                type,
                data: { id }
            };
        }
    }

    static UINT16 = class {
        static decode(buffer) {
            const view = new DataView(buffer);
            let offset = 0;

            const type = view.getUint8(offset);
            offset += 1;

            const data = view.getUint16(offset, true);
            offset += 2;

            return {
                type,
                data
            };
        }
    }


    static INPUT_STATE = class {

        static encode(type, inputs) {

            /*
            inputs example:
            {
                w: true,
                a: false,
                s: false,
                d: true
            }
            */

            const buffer = new ArrayBuffer(2);
            const view = new DataView(buffer);
            
            let offset = 0;

            // packet type
            view.setUint8(offset, type);
            offset += 1;

            // pack inputs into a single byte
            let flags = 0;

            if (inputs.w) flags |= 1 << 0;
            if (inputs.a) flags |= 1 << 1;
            if (inputs.s) flags |= 1 << 2;
            if (inputs.d) flags |= 1 << 3;

            view.setUint8(offset, flags);
            offset += 1;

            return buffer;
        }

    }

    static MAP = class {
        static decode(buffer) {
            const view = new DataView(buffer);
            let offset = 0;

            // Packet type
            const type = view.getUint8(offset);
            offset += 1;

            // Header
            const width = view.getUint16(offset, true);
            offset += 2;

            const height = view.getUint16(offset, true);
            offset += 2;

            const tileSize = view.getUint16(offset, true);
            offset += 2;

            const spawnX = view.getUint16(offset, true);
            offset += 2;

            const spawnY = view.getUint16(offset, true);
            offset += 2;

            // Tile count
            const tileCount = view.getUint32(offset, true);
            offset += 4;

            const tiles = [];

            // NOW 2 BYTES PER TILE
            for (let i = 0; i < tileCount; i++) {
                const packed = view.getUint16(offset, true);
                offset += 2;

                const texture = packed & 0b11111;        // bits 0–4
                const rotation = (packed >> 5) & 0b11;   // bits 5–6
                const underlay = (packed >> 7) & 0b11111;// bits 7–11

                tiles.push({
                    texture,
                    rotation,
                    underlay
                });
            }

            return {
                type,
                data: {
                    width,
                    height,
                    tileSize,
                    spawn: { x: spawnX, y: spawnY },
                    tiles
                }
            };
        }
    };
}