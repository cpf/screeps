const {TOWER_BUILD_STEP, TOWER_BOTTLENECK_NORTH_STEP, TOWER_BOTTLENECK_EAST_STEP, TOWER_BOTTLENECK_SOUTH_STEP, TOWER_BOTTLENECK_WEST_STEP, TOWER_BOTTLENECK_LOCATIONS} = require('build.const')
const utils = require('utils')
const TOWER_SQUARE_AREA = 5
const TOWER_FILTER_AREA = 2

class TowerBuilder {
    constructor(room) {
        this.room = room
    }

    run() {
        if (!this.canBuildTower()) {
            return
        }

        if (Game.time % TOWER_BUILD_STEP == 0) {
            this.buildTower()
            this.clearTowerBottleneckLocations()
        }

        if (Game.time % TOWER_BOTTLENECK_NORTH_STEP == 0) {
            this.optionsForBottleneck(FIND_EXIT_TOP)
        }

        if (Game.time % TOWER_BOTTLENECK_EAST_STEP == 0) {
            this.optionsForBottleneck(FIND_EXIT_RIGHT)
        }

        if (Game.time % TOWER_BOTTLENECK_SOUTH_STEP == 0) {
            this.optionsForBottleneck(FIND_EXIT_BOTTOM)
        }

        if (Game.time % TOWER_BOTTLENECK_WEST_STEP == 0) {
            this.optionsForBottleneck(FIND_EXIT_LEFT)
        }
    }

    buildTower() {
        // Focus on protecting resources, have at least one tower per focuspoint
        let options = this.optionsFor(this.room.find(FIND_MY_SPAWNS), {})
        options = this.optionsFor(this.room.find(FIND_SOURCES), options)
        options = this.optionsFor([this.room.controller], options)

        if (Object.keys(options).length <= 0) {
            let positions = this.getBottleneckToCoverLocations()
            options = this.getBottleneckSquaresHeatmap(positions)
            options = this.filterOptionsPerQuadrant(options)
        }

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
        // this.room.createFlag(pos, "Tower")
        // let err = 0
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

    // Filter tower options so we don't exceed 2 towers per quadrant of the room
    filterOptionsPerQuadrant(options) {
        let midXleft = (49 / 2) - 1
        let midXRight = (49 / 2) + 1
        let midYup = (49 / 2) - 1
        let midYdown = (49 / 2) + 1

        // Quadrant top-left
        let structuresTopLeft = this.room.lookForAtArea(LOOK_STRUCTURES, 0, 0, midYup, midXleft, true).filter(o => o != undefined && o.structure != undefined && o.structure.structureType == STRUCTURE_TOWER)
        let constructionSitesTopLeft = this.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, 0, 0, midYup, midXleft, true).filter(o => o != undefined && o.constructionSite != undefined && o.constructionSite.structureType == STRUCTURE_TOWER)
        let topLeftCount = structuresTopLeft.length + constructionSitesTopLeft.length
        // Quadrant top-right
        let structuresTopRight = this.room.lookForAtArea(LOOK_STRUCTURES, 0, midXRight, midYup, 49, true).filter(o => o != undefined && o.structure != undefined && o.structure.structureType == STRUCTURE_TOWER)
        let constructionSitesTopRight = this.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, 0, midXRight, midYup, 49, true).filter(o => o != undefined && o.constructionSite != undefined && o.constructionSite.structureType == STRUCTURE_TOWER)
        let topRightCount = structuresTopRight.length + constructionSitesTopRight.length
        // Quadrant bottom-left
        let structuresBottomLeft = this.room.lookForAtArea(LOOK_STRUCTURES, midYdown, 0, 49, midXRight, true).filter(o => o != undefined && o.structure != undefined && o.structure.structureType == STRUCTURE_TOWER)
        let constructionSitesBottomLeft = this.room.lookForAtArea(LOOK_STRUCTURES, midYdown, 0, 49, midXRight, true).filter(o => o != undefined && o.constructionSite != undefined && o.constructionSite.structureType == STRUCTURE_TOWER)
        let bottomLeftCount = structuresBottomLeft.length + constructionSitesBottomLeft.length
        // Quadrant bottom-right
        let structuresBottomRight = this.room.lookForAtArea(LOOK_STRUCTURES, midYdown, midXRight, 49, 49, true).filter(o => o != undefined && o.structure != undefined && o.structure.structureType == STRUCTURE_TOWER)
        let constructionSitesBottomRight = this.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, midYdown, midXRight, 49, 49, true).filter(o => o != undefined && o.constructionSite != undefined && o.constructionSite.structureType == STRUCTURE_TOWER)
        let bottomRightCount = structuresBottomRight.length + constructionSitesBottomRight.length

        Object.keys(options).forEach(function(key) {
            let spl = key.split(',')
            let x = Number(spl[0])
            let y = Number(spl[1])

            if (x <= midXleft && y <= midYup && topLeftCount >= 2) { // top left
                options[key] = 0
                return
            }

            if (x >= midXRight && y <= midYup && topRightCount >= 2) { // top right
                options[key] = 0
                return
            }
            
            if (x <= midXleft && y >= midYdown && bottomLeftCount >= 2) { // bottom left
                options[key] = 0
                return
            }

            if (x >= midXRight && y >= midYdown && bottomRightCount >= 2) { // bottom right
                options[key] = 0
            }
        })

        return options
    }

    optionsForBottleneck(direction) {
        let opts = {
            "ignoreCreeps": true,
            "ignoreDestructibleStructures": true,
            "ignoreRoads": true,
        }
        let ingress = this.room.find(direction)
        let self = this
        _.forEach(ingress, function(pos) {
            let controllerPath = self.room.findPath(pos, self.room.controller.pos, opts)
            _.forEach(controllerPath, function(pathPos) {
                self.addTowerBottleneckLocation(pathPos.x, pathPos.y)
            })
        })
    }

    getBottleneckSquaresHeatmap(positions) {
        let poi = {}
        let self = this
        _.forEach(positions, function(pos) {
            let spl = pos.split(',')
            let x = Number(spl[0])
            let y = Number(spl[1])
            poi = self.optionsFor([{
                'pos': {
                    'x': x,
                    'y': y
                }
            }], poi)
        })

        // incentivice to put near edges, but not too close
        _.forEach(Object.keys(poi), function(key) {
            let spl = key.split(',')
            let x = Number(spl[0])
            let y = Number(spl[1])

            if ((x < 15 && x >= 5) || (x > 34 && x <= 44)) {
                poi[key] += 10
            }

            if ((y < 15 && y >= 5) || (y > 34 && x <= 44)) {
                poi[key] += 10
            }
        })

        return poi
    }

    getBottleneckToCoverLocations() {
        let roomname = this.room.name
        if (!(TOWER_BOTTLENECK_LOCATIONS in Memory) || !(roomname in Memory[TOWER_BOTTLENECK_LOCATIONS])) {
            return []
        }

        let positions = []
        let max = 0
        _.forEach(Object.keys(Memory[TOWER_BOTTLENECK_LOCATIONS][roomname]), function(key) {
            let val = Memory[TOWER_BOTTLENECK_LOCATIONS][roomname][key]
            if (val > max) {
                max = val
                positions = []
            }
            
            if (val == max) {
                positions.push(key)
            }
        })

        return positions
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
        let structures = this.room.lookForAtArea(LOOK_STRUCTURES, yup, xup, ydown, xdown, true)
        return _.filter(structures, (s) => s.structure.structureType == STRUCTURE_TOWER).length > 0
    }

    filterForStructures(passableArea) {
        let filteredArea = []
        let self = this

        passableArea.forEach(function(square) {
            let spl = square.split(',')
            let pos = new RoomPosition(spl[0], spl[1], self.room.name)

            let boundaryTop = Number(spl[1]) - TOWER_FILTER_AREA
            let boundaryLeft = Number(spl[0]) - TOWER_FILTER_AREA
            let boundaryBottom = Number(spl[1]) + TOWER_FILTER_AREA
            let boundaryRight = Number(spl[0]) + TOWER_FILTER_AREA

            let structures = pos.lookFor(LOOK_STRUCTURES)
            let cs = pos.lookFor(LOOK_CONSTRUCTION_SITES)
            let structureArea = self.room.lookForAtArea(LOOK_STRUCTURES, boundaryTop, boundaryLeft, boundaryBottom, boundaryRight, true)
            let adjacentStructures = []
            structureArea.forEach(function(s) {
                if (s.structure.structureType == STRUCTURE_TOWER) {
                    adjacentStructures.push(s)
                }
            })
            let constructionArea = self.room.lookForAtArea(LOOK_CONSTRUCTION_SITES, boundaryTop, boundaryLeft, boundaryBottom, boundaryRight, true)
            let adjacentConstructions = []
            constructionArea.forEach(function(c) {
                if (c.constructionSite.structureType == STRUCTURE_TOWER) {
                    adjacentConstructions.push(c)
                }
            })

            if (structures.length == 0 && cs.length == 0 && adjacentStructures.length == 0 && adjacentConstructions == 0) {
                filteredArea.push(square)
            }
        })

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

    addTowerBottleneckLocation(x, y) {
        if (!(TOWER_BOTTLENECK_LOCATIONS in Memory)) {
            Memory[TOWER_BOTTLENECK_LOCATIONS] = {}
        }

        if (!(this.room.name in Memory[TOWER_BOTTLENECK_LOCATIONS])) {
            Memory[TOWER_BOTTLENECK_LOCATIONS][this.room.name] = {}
        }

        let key = x + "," + y
        if (!(key in Memory[TOWER_BOTTLENECK_LOCATIONS])) {
            Memory[TOWER_BOTTLENECK_LOCATIONS][this.room.name][key] = 1
        } else {
            Memory[TOWER_BOTTLENECK_LOCATIONS][this.room.name][key] += 1
        }
    }

    clearTowerBottleneckLocations() {
        delete Memory[TOWER_BOTTLENECK_LOCATIONS][this.room.name]
    }
}

module.exports = TowerBuilder
