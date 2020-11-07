class Harvester {
    constructor(obj) {
        if (obj.type == "Creep") {
            this.creep = obj
        }

        if (obj.type == "Spawn") {
            this.spawn = obj
            var body = this.calculateBody()

            var creepName = 'H' + Game.time
            var err = this.spawn.spawnCreep(body.sort(), creepName, 
            {
                memory: {
                    role: 'H'
                }
            })

            if (err != OK) {
                console.log("H ERROR SPAWNING CREEP: " + err)
                return
            }

            var creep = Game.creeps[creepName]

            if (!creep.memory.targetSource) {
                var sources = creep.room.find(FIND_SOURCES)
                for (var index in sources) {
                    if (creep.room.name in Memory.rooms) {
                        var targetSource = sources[index]
                        if (targetSource.id in Memory.rooms[creep.room.name].sources) {
                            var sourceInfo = Memory.rooms[creep.room.name].sources[targetSource.id]
                            if (sourceInfo.targetHarvesters > sourceInfo.assignedHarvesters.length) {
                                creep.memory.targetSource = targetSource.id
                                sourceInfo.assignedHarvesters.push(creep.name)
                                break
                            }
                        }
                    }
                }
            }

            this.creep = creep
        }
    }

    run() {
        var source = Game.getObjectById(this.creep.memory.targetSource)
        var err = this.creep.harvest(source)
        switch (err) {
            case ERR_NOT_IN_RANGE:
                this.creep.moveTo(source, {
                    visualizePathStyle: {
                        stroke: '#00ff00'
                    }
                })
                break
            case ERR_NOT_FOUND:
                console.log("Harvester ERR_NOT_FOUND")
                break
            case ERR_INVALID_TARGET:
                console.log("Harvester invalid target: " + source)
                break
            case ERR_TIRED:
                console.log("Harvester extractor still cooling down")
                break
            case ERR_NO_BODYPART:
                console.log("Harvester no bodyparts!")
                break
            case OK:
            case ERR_BUSY:
            case ERR_NOT_ENOUGH_RESOURCES:
                break
            default:
                console.log("Harvester something else went wrong: " + err)
                break
        }

        if (this.creep.store.getFreeCapacity() == 0) {
            var targets = this.creep.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (structure) => (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN
                    ) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            })

            if (targets.length <= 0) {
                this.drop()
            } else {
                for (var index in targets) {
                    var err = this.creep.transfer(targets[index], RESOURCE_ENERGY)
                    switch (err) {
                        case ERR_NOT_ENOUGH_RESOURCES:
                        case ERR_INVALID_TARGET:
                        case ERR_FULL:
                        case ERR_NOT_IN_RANGE:
                        case ERR_INVALID_ARGS:
                            this.drop()
                            break
                        case OK:
                            break
                        default:
                            console.log("Harvester dropoff something else went wrong: " + err)
                    }
                }
            }
        }
    }

    drop() {
        this.creep.drop(RESOURCE_ENERGY)
    }

    calculateBody() {
        var energyAvailable = this.spawn.room.energyAvailable
        var toAdd = [
            WORK,
            WORK,
            WORK,
            WORK,
            CARRY,
            CARRY,
            CARRY,
            WORK,
            MOVE,
            MOVE,
            CARRY,
            WORK
        ]
        var body = [ WORK, CARRY, MOVE ]

        var buildCost = 0
        for (var index in body) {
            buildCost += BODYPART_COST[body[index]]
        }

        for (index in toAdd) {
            var part = toAdd[index]
            if (buildCost + BODYPART_COST[part] <= energyAvailable) {
                body.push(part)
                buildCost += BODYPART_COST[part]
            } else {
                break
            }
        }

        return body
    }
}

module.exports = Harvester