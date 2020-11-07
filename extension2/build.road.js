const {BUILD_DATA, ROAD_DATA, PHASE_EXTENSIONS, X_ROOM_EDGE, Y_ROOM_EDGE, ROAD_BUILD_RESET_DATA_STEP, ROAD_BUILD_STEP, ROAD_BUILD_CALC_STEP} = require("build.const")

class Road {
    constructor(room) {
        this.room = room
    }

    run() {
        if (Game.time % ROAD_BUILD_RESET_DATA_STEP == 0) {
            this.resetData()
            return
        }

        if (Game.time % ROAD_BUILD_STEP == 0) {
            this.buildRoad()
            return
        }

        if (Game.time % ROAD_BUILD_CALC_STEP == 0) {
            this.calculateRoadOptions()
        }
    }

    calculateRoadOptions() {
        var creeps = this.room.find(FIND_MY_CREEPS)
        for (var index in creeps) {
            var creep = creeps[index]

            // We do not want to consider edges, since they are not buildable
            if (creep.pos.x >= X_ROOM_EDGE || creep.pos.y >= Y_ROOM_EDGE) {
                // console.log("[build_road] Ignoring creep pos " + creep.pos.x + "," + creep.pos.y + " based on room edge")
                continue
            }

            var positionData = creep.pos.look()
            var ignore = false
            for (var index in positionData) {
                if (positionData[index].type == LOOK_FLAGS || positionData[index].type == LOOK_STRUCTURES) {
                    ignore = true
                    break
                }
            }

            if (ignore) {
                // console.log("Ignoring creep pos " + creep.pos.x + "," + creep.pos.y + " based on LOOK_FLAGS or LOOK_STRUCTURES")
                continue
            }

            var key = creep.pos.x + "," + creep.pos.y
            if (!(key in Memory.roadData[this.room.name].roadOptions)) {
                Memory.roadData[this.room.name].roadOptions[key] = 1
            } else {
                Memory.roadData[this.room.name].roadOptions[key] += 1
            }
        }
    }

    buildRoad() {
        if (!(ROAD_DATA in Memory)) {
            return
        }

        var highestOptionValue = -1
        var highestOptionKey = ""
        for (var key in Memory.roadData[this.room.name].roadOptions) {
            var spl = key.split(',')
            var rp = new RoomPosition(spl[0], spl[1], this.room.name)
            var positionData = rp.look()
            var hasFlagOrRoad = false
            for (var index in positionData) {
                if (positionData[index].type == LOOK_FLAGS || positionData[index].type == LOOK_STRUCTURES || positionData[index].type == LOOK_CONSTRUCTION_SITES) {
                    hasFlagOrRoad = true
                    break
                }
            }

            if (Memory.roadData[this.room.name].roadOptions[key] > highestOptionValue && !hasFlagOrRoad) {
                highestOptionValue = Memory.roadData[this.room.name].roadOptions[key]
                highestOptionKey = key
            }
        }

        if (highestOptionValue < 20) {
            console.log("[build_road] No interesting target, highest option value = " + highestOptionValue)
            Memory[BUILD_DATA][this.room.name].phase = PHASE_EXTENSIONS
            Memory[ROAD_DATA][this.room.name].failedRoadBuild += 1
            return
        }

        Memory[ROAD_DATA][this.room.name].failedRoadBuild = 0

        console.log("[build_road] Road: " + highestOptionKey)
        var spl = highestOptionKey.split(',')
        var rp = new RoomPosition(spl[0], spl[1], this.room.name)

        var err = rp.createConstructionSite(STRUCTURE_ROAD)
        switch (err) {
            case ERR_INVALID_TARGET:
                console.log("[build_road] Couldn't create road, invalid target " + highestOptionKey)
                break
            case ERR_FULL:
                console.log("[build_road] Too many construction sites!")
                break
            case ERR_INVALID_ARGS:
                console.log("[build_road] Couldn't create road: invalid args!?")
                break
            case ERR_RCL_NOT_ENOUGH:
                console.log("[build_road] Couldn't create road: RCL not high enough?!")
                break
            case OK:
            default:
                break
        }

        // After each succesful road build, switch phase
        Memory[BUILD_DATA][this.room.name].phase = PHASE_EXTENSIONS
    }

    resetData() {
        console.log("[build_road] Resetting road data")
        if (ROAD_DATA in Memory) {
            delete Memory[ROAD_DATA]
        }

        if (!(ROAD_DATA in Memory)) {
            Memory.roadData = {}
            Memory.roadData[this.room.name] = {
                "roadOptions": {},
                "failedRoadBuild": 0
            }
        }
    }
}

module.exports = Road