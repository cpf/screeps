module.exports = {
    STRUCTURE: "structure",
    TERRAIN: "terrain",
    TERRAIN_PLAIN: "plain",
    TERRAIN_SWAMP: "swamp",

    cleanup: function(room) {
        for (var name in Memory.creeps) {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name]
            }
        }

        if ("rooms" in Memory && room.name in Memory.rooms) {
            for (var resourceId in Memory.rooms[room.name].sources) {
                for (var index in Memory.rooms[room.name].sources[resourceId].assignedHarvesters) {
                    var creepName = Memory.rooms[room.name].sources[resourceId].assignedHarvesters[index]
                    if (!(creepName in Game.creeps)) {
                        var newAssignedHarvesters = Memory.rooms[room.name].sources[resourceId].assignedHarvesters.filter(function(value, filterIndex, arr) {
                            return index != filterIndex
                        })

                        Memory.rooms[room.name].sources[resourceId].assignedHarvesters = newAssignedHarvesters
                    }
                }
            }
        }

        var builders = _.filter(Game.creeps, (creep) => creep.memory.role == 'B')
        var targets = []
        for (var index in builders) {
            var builder = builders[index]
            targets.push(builder.memory.target)
        }

        for (var index in Memory.reservedBuildSites) {
            Memory.reservedBuildSites = Memory.reservedBuildSites.filter(function(value, filterIndex, arr) {
                return Game.getObjectById(value) != null && targets.indexOf(value) != -1
            })
        }
    },

    pushRoomSourceMemory: function(room) {
        // Couple of statics
        if (!("rooms" in Memory)) {
            Memory.rooms = {}
        }

        if (!(room.name in Memory.rooms) || Memory.rooms[room.name].lastUpdated < Game.time - 50000) {
            Memory.rooms[room.name] = {
                lastUpdated: Game.time,
                sources: {}
            }

            // Look around the source to find available standing spots
            var sources = room.find(FIND_SOURCES)
            for (var sourceIndex in sources) {
                var source = sources[sourceIndex]
                var sourceX = source.pos.x
                var sourceY = source.pos.y
                var boundaryYup = sourceY - 1
                var boundaryYdown = sourceY + 1
                var boundaryXup = sourceX - 1
                var boundaryXdown = sourceX + 1

                var locationInfo = room.lookAtArea(boundaryYup, boundaryXup, boundaryYdown, boundaryXdown)

                var passableTerrain = 0
                for (var yindex in locationInfo) {
                    var field = locationInfo[yindex]
                    for (var xindex in field) {
                        var fieldArray = field[xindex]
                        for (var arrayIndex in fieldArray) {
                            var obj = fieldArray[arrayIndex]
                            if (obj.type == this.STRUCTURE && obj.structure.structureType != STRUCTURE_ROAD) {
                                break
                            }

                            if (obj.type == this.TERRAIN && obj.terrain == this.TERRAIN_SWAMP || obj.terrain == this.TERRAIN_PLAIN) {
                                passableTerrain += 1
                                break
                            }
                        }
                    }
                }

                var assignedHarvesters = []
                if (source.id in Memory.rooms[room.name].sources && "assignedHarvesters" in Memory.rooms[room.name].sources[source.id]) {
                    assignedHarvesters = Memory.rooms[room.name].sources[source.id].assignedHarvesters
                }

                Memory.rooms[room.name].sources[source.id] = {
                    targetHarvesters: passableTerrain,
                    assignedHarvesters: assignedHarvesters
                }
            }
        }
    },

    findPassableArea: function(locationInfo, notRoads) {
        let area = []

        for (var yindex in locationInfo) {
            var field = locationInfo[yindex]
            for (var xindex in field) {
                var fieldArray = field[xindex]
                for (var arrayIndex in fieldArray) {
                    var obj = fieldArray[arrayIndex]
                    if (obj.type == this.STRUCTURE && (notRoads || obj.structure.structureType != STRUCTURE_ROAD)) {
                        break
                    }

                    if (obj.type == this.TERRAIN && obj.terrain == this.TERRAIN_SWAMP || obj.terrain == this.TERRAIN_PLAIN) {
                        area.push(xindex + "," + yindex)
                        break
                    }
                }
            }
        }

        return area
    }
};