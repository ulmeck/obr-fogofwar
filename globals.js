const ID = "com.armindoflores.fogofwar";

class RoomCash {
    constructor() {
        this.metadata = undefined;
        this.ready = false;
    }
};

class SceneCash {
    constructor() {
        this.items = undefined; 
        this.metadata = undefined;
        this.gridDpi = undefined;
        this.gridScale = undefined;
        this.fog = undefined;
        this.ready = false;
    }
};

export { ID };
export const sceneCache = new SceneCash();
export const roomCache = new RoomCash();
