const {TOWER_BUILD_STEP} = require('build_const')
const utils = require('utils')

class TowerBuilder {
    constructor(room) {
        this.room = room
    }

    run() {
        if (Game.time % TOWER_BUILD_STEP == 0 && this.canBuildTower()) {
            this.buildTower()
        }
    }

    buildTower() {
        let options = {}

        let spawns = this.room.find(FIND_MY_SPAWNS)
        for (let index in spawns) {
            let spawn = spawns[index]
            for (let i = 5; i > 0; i--) {
                let boundaryYup = spawn.pos.y - i
                let boundaryYdown = spawn.pos.y + i
                let boundaryXup = spawn.pos.x - i
                let boundaryXdown = spawn.pos.x + i

                let locationInfo
                try {
                    if (this.shouldDisqualifyArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)) {
                        break
                    }

                    locationInfo = this.room.lookAtArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)
                    let passableArea = utils.findPassableArea(locationInfo, true)
                    let filteredArea = this.filterForStructures(passableArea)

                    for (let b in filteredArea) {
                        let square = filteredArea[b]
                        if (!(square in options)) {
                            options[square] = 1
                        } else {
                            options[square] += 1
                        }
                    }
                } catch (err) {
                    continue
                }
                break
            }
        }

        let sources = this.room.find(FIND_SOURCES)
        for (let index in sources) {
            let source = sources[index]
            for (let i = 5; i > 0; i--) {
                let boundaryYup = source.pos.y - i
                let boundaryYdown = source.pos.y + i
                let boundaryXup = source.pos.x - i
                let boundaryXdown = source.pos.x + i

                let locationInfo
                try {
                    if (this.shouldDisqualifyArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)) {
                        break
                    }

                    locationInfo = this.room.lookAtArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)
                    let passableArea = utils.findPassableArea(locationInfo, true)
                    let filteredArea = this.filterForStructures(passableArea)

                    for (let b in filteredArea) {
                        let square = filteredArea[b]
                        if (!(square in options)) {
                            options[square] = 1
                        } else {
                            options[square] += 1
                        }
                    }
                } catch (err) {
                    continue
                }
                break
            }
        }

        let controller = this.room.controller
        for (let i = 5; i > 0; i--) {
            let boundaryYup = controller.pos.y - i
            let boundaryYdown = controller.pos.y + i
            let boundaryXup = controller.pos.x - i
            let boundaryXdown = controller.pos.x + i

            try {
                if (this.shouldDisqualifyArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)) {
                    break
                }

                let locationInfo = this.room.lookAtArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)
                let passableArea = utils.findPassableArea(locationInfo, true)
                let filteredArea = this.filterForStructures(passableArea)

                for (let b in filteredArea) {
                    let square = filteredArea[b]
                    if (!(square in options)) {
                        options[square] = 1
                    } else {
                        options[square] += 1
                    }
                }
            } catch (err) {
                continue
            }
            break
        }

        let highestOption = -1
        let highestPos = ""
        for (let k in options) {
            if (options[k] > highestOption) {
                highestOption = options[k]
                highestPos = k
            }
        }

        let spl = highestPos.split(',')
        let pos = new RoomPosition(spl[0], spl[1], this.room.name)
        let lookData = pos.lookFor(LOOK_CONSTRUCTION_SITES)
        if (lookData.length) {
            return
        }

        console.log("Tower: " + highestPos)
        let err = this.room.createConstructionSite(pos, STRUCTURE_TOWER)
        switch (err) {
            case ERR_INVALID_TARGET:
                console.log("Invalid target " + pos)
                break
            case ERR_FULL:
                console.log("Too many construction sites")
                break
            case ERR_INVALID_ARGS:
                console.log("Invalid args")
                break
            case ERR_RCL_NOT_ENOUGH:
                console.log("Can't build because RCL too low")
                break
        }
    }

    shouldDisqualifyArea(yup, xup, ydown, xdown) {
        let hasTower = false
        let structures = this.room.lookForAtArea(LOOK_STRUCTURES, yup, xup, ydown, xdown, true)
        for (let s in structures) {
            let l = structures[s]
            if (l.structure.structureType == STRUCTURE_TOWER) {
                hasTower = true
                break
            }
        }

        return hasTower
    }

    filterForStructures(passableArea) {
        let filteredArea = []

        for (let o in passableArea) {
            let square = passableArea[o]
            let spl = square.split(',')
            let pos = new RoomPosition(spl[0], spl[1], this.room.name)

            let structures = pos.lookFor(LOOK_STRUCTURES)
            let cs = pos.lookFor(LOOK_CONSTRUCTION_SITES)
            if (structures.length == 0 && cs.length == 0) {
                filteredArea.push(square)
            }
        }

        return filteredArea
    }

    canBuildTower() {
        let towers = this.room.find(FIND_STRUCTURES, {
            filter: (structure) => structure.structureType == STRUCTURE_TOWER
        })
        let constructionSites = this.room.find(FIND_CONSTRUCTION_SITES, {
            filter: (constructionSite) => constructionSite.structureType == STRUCTURE_TOWER
        })
        return CONTROLLER_STRUCTURES[STRUCTURE_TOWER][this.room.controller.level] > towers.length + constructionSites.length
    }
}

module.exports = TowerBuilder