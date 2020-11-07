const {BUILD_DATA, EXTENSION_OPTIONS, PHASE_ROADS} = require("build.const")
const utils = require('utils')

class Extension {
    constructor(room) {
        this.room = room
    }

    run() {
        if (!this.canBuildExtension) {
            Memory[BUILD_DATA][this.room.name].phase = PHASE_ROADS
        }

        if (Game.time % 50 == 0) {

            this.extensionCalculateLowHangingFruit()
            return
        }

        this.constructExtension()
        Memory[BUILD_DATA][this.room.name].phase = PHASE_ROADS
        
    }
    constructExtension() {
        if (!(EXTENSION_OPTIONS in Memory[BUILD_DATA][this.room.name])) {
            return false
        }

        let maxPos = ""
        let maxCount = 0

        for (let pos in Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]) {
            let c = Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS][pos]
            if (c > maxCount) {
                maxPos = pos
                maxCount = c
            }
        }

        if (maxCount < 10) {
            return false
        }

        let spl = maxPos.split(',')
        let rp = new RoomPosition(spl[0], spl[1], this.room.name)

        let lookData = rp.lookFor(LOOK_CONSTRUCTION_SITES)
        if (lookData.length) {
            delete Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]
            return false
        }

        console.log("[build_ext] Extension: " + maxPos)
        let err = rp.createConstructionSite(STRUCTURE_EXTENSION)
        switch (err) {
            case ERR_INVALID_TARGET:
                console.log("Invalid target " + rp)
                delete Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]
                return false
            case ERR_FULL:
                console.log("Too many construction sites")
                delete Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]
                return false
            case ERR_INVALID_ARGS:
                console.log("Invalid args")
                delete Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]
                return false
            case ERR_RCL_NOT_ENOUGH:
                console.log("Can't build because RCL too low")
                delete Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]
                return false
        }

        delete Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]

        return true
    }

    extensionCalculateLowHangingFruit() {
        let harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'H')
        for (let index in harvesters) {
            let harvester = harvesters[index]
            let boundaryYup = harvester.pos.y - 1
            let boundaryYdown = harvester.pos.y + 1
            let boundaryXup = harvester.pos.x - 1
            let boundaryXdown = harvester.pos.x + 1

            let locationInfo = this.room.lookAtArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)
            let passableArea = utils.findPassableArea(locationInfo, true)

            if (!(EXTENSION_OPTIONS in Memory[BUILD_DATA][this.room.name])) {
                Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS] = {}
            }

            for (let index in passableArea) {
                let extensionOptions = Memory[BUILD_DATA][this.room.name][EXTENSION_OPTIONS]

                // Post-processing: Investigate the area around the options
                let spl = passableArea[index].split(',')
                let baseX = parseInt(spl[0])
                let baseY = parseInt(spl[1])
                let bYup = baseY - 1
                let bYdown = baseY + 1
                let bXup = baseX - 1
                let bXdown = baseX + 1

                let allowAdd = true
                let secondaryLocationInfo = this.room.lookAtArea(bYup, bYdown, bXup, bXdown)
                for (let yindex in secondaryLocationInfo) {
                    let row = secondaryLocationInfo[yindex]
                    for (let xindex in row) {
                        let field = row[xindex]
                        for (let fieldIndex in field) {
                            let obj = field[fieldIndex]
                            // Basically not right next to the spawn
                            console.log(utils.STRUCTURE)
                            if (obj.type == utils.STRUCTURE && obj.structure.structureType == STRUCTURE_SPAWN) {
                                allowAdd = false
                                break
                            }
                        }
                    }
                }


                if (allowAdd) {
                    if (!(passableArea[index] in extensionOptions)) {
                        extensionOptions[passableArea[index]] = 1
                    } else {
                        extensionOptions[passableArea[index]] += 1
                    }
                }
            }
        }
    }

    canBuildExtension() {
        var extensions = this.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType == STRUCTURE_EXTENSION
        })
        return CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][this.room.controller.level] > extensions.length
    }
}

module.exports = Extension