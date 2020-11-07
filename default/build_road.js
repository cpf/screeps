const {BUILD_DATA, ROAD_DATA, PHASE_EXTENSIONS} = require("build_const")

class Road {
    constructor(room) {
        this.room = room
    }

    run() {
        if (Game.time % 100000 == 0) {
            this.resetData()
            return
        }

        if (Game.time % 500 == 0) {
            this.buildRoad()
            return
        }

        if (Game.time % 100 == 0) {
            this.calculateRoadOptions()
        }
    }

    calculateRoadOptions() {
        if (!(ROAD_DATA in Memory)) {
            this.fixData()
        }

        var creeps = this.room.find(FIND_MY_CREEPS)
        for (var index in creeps) {
            var creep = creeps[index]

            var positionData = creep.pos.look()
            for (var index in positionData) {
                if (positionData[index].type == LOOK_FLAGS || positionData[index].type == LOOK_STRUCTURES) {
                    break
                }
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
            console.log("No interesting target, highest option value = " + highestOptionValue)
            Memory[BUILD_DATA][this.room.name].phase = PHASE_EXTENSIONS
            Memory[ROAD_DATA][this.room.name].failedRoadBuild += 1
            return
        }

        Memory[ROAD_DATA][this.room.name].failedRoadBuild = 0

        console.log("Road: " + highestOptionKey)
        var spl = highestOptionKey.split(',')
        var rp = new RoomPosition(spl[0], spl[1], this.room.name)

        var err = rp.createConstructionSite(STRUCTURE_ROAD)
        switch (err) {
            case ERR_INVALID_TARGET:
                console.log("Couldn't create road, invalid target " + highestOptionKey)
                break
            case ERR_FULL:
                console.log("Too many construction sites!")
                break
            case ERR_INVALID_ARGS:
                console.log("Couldn't create road: invalid args!?")
                break
            case ERR_RCL_NOT_ENOUGH:
                console.log("Couldn't create road: RCL not high enough?!")
                break
            case OK:
            default:
                break
        }

        // After each succesful road build, switch phase
        Memory[BUILD_DATA][this.room.name].phase = PHASE_EXTENSIONS
    }

    resetData() {
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