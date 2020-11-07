const {TOWER_BUILD_STEP} = require('build.const')
const utils = require('utils')
const TOWER_SQUARE_AREA = 5

class TowerBuilder {
    constructor(room) {
        this.room = room
    }

    run() {
        // this.optionsForBottleneck({})
        if (Game.time % TOWER_BUILD_STEP == 0 && this.canBuildTower()) {
            this.buildTower()
        }
    }

    buildTower() {
        // Focus on protecting resources, have at least one tower per focuspoint
        let options = this.optionsFor(this.room.find(FIND_MY_SPAWNS), {})
        options = this.optionsFor(this.room.find(FIND_SOURCES), options)
        options = this.optionsFor([this.room.controller], options)

        // Try to detect bottlenecks, and focus until max amount of towers reached
        // options = this.optionsForBottleneck(options)

        if (Object.keys(options).length <= 0) {
            return
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

        console.log("[build_tower] Tower: " + highestPos)
        let err = this.room.createConstructionSite(pos, STRUCTURE_TOWER)
        switch (err) {
            case ERR_INVALID_TARGET:
                console.log("[build_tower] Invalid target " + pos)
                break
            case ERR_FULL:
                console.log("[build_tower] Too many construction sites")
                break
            case ERR_INVALID_ARGS:
                console.log("[build_tower] Invalid args")
                break
            case ERR_RCL_NOT_ENOUGH:
                console.log("[build_tower] Can't build because RCL too low")
                break
        }
    }

    optionsForBottleneck(options) {
        let opts = {
            "ignoreCreeps": true,
            "ignoreDestructibleStructures": true,
            "ignoreRoads": true,
        }
        let resp = this.room.find(FIND_EXIT_TOP)
        for (let posindex in resp) {
            let pos = resp[posindex]

            let controllerPath = this.room.findPath(pos, this.room.controller.pos, opts)
            new RoomVisual(this.room.name).poly(controllerPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })

            let spawnPath = this.room.findPath(pos, this.room.find(FIND_MY_SPAWNS)[0].pos, opts)
            new RoomVisual(this.room.name).poly(spawnPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })
        }
        resp = this.room.find(FIND_EXIT_RIGHT)
        for (let posindex in resp) {
            let pos = resp[posindex]

            let controllerPath = this.room.findPath(pos, this.room.controller.pos, opts)
            new RoomVisual(this.room.name).poly(controllerPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })

            let spawnPath = this.room.findPath(pos, this.room.find(FIND_MY_SPAWNS)[0].pos, opts)
            new RoomVisual(this.room.name).poly(spawnPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })
        }
        resp = this.room.find(FIND_EXIT_BOTTOM)
        for (let posindex in resp) {
            let pos = resp[posindex]

            let controllerPath = this.room.findPath(pos, this.room.controller.pos, opts)
            new RoomVisual(this.room.name).poly(controllerPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })

            let spawnPath = this.room.findPath(pos, this.room.find(FIND_MY_SPAWNS)[0].pos, opts)
            new RoomVisual(this.room.name).poly(spawnPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })
        }
        resp = this.room.find(FIND_EXIT_LEFT)
        for (let posindex in resp) {
            let pos = resp[posindex]

            let controllerPath = this.room.findPath(pos, this.room.controller.pos, opts)
            new RoomVisual(this.room.name).poly(controllerPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })

            let spawnPath = this.room.findPath(pos, this.room.find(FIND_MY_SPAWNS)[0].pos, opts)
            new RoomVisual(this.room.name).poly(spawnPath, {
                stroke: '#f00',
                strokeWidth: .15,
                opacity: .2,
                lineStyle: undefined
            })
        }
    }

    optionsFor(obj, options) {
        for (let index in obj) {
            let o = obj[index]
            for (let i = TOWER_SQUARE_AREA; i > 0; i--) {
                let boundaryYup = o.pos.y - i
                let boundaryYdown = o.pos.y + i
                let boundaryXup = o.pos.x - i
                let boundaryXdown = o.pos.x + i

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

        return options
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